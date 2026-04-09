import hashlib
import hmac
import uuid
import base64
import requests
import os
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

MOMO_CONFIG = {
    "partner_code": os.getenv("MOMO_PARTNER_CODE", "MOMO"),
    "access_key": os.getenv("MOMO_ACCESS_KEY", "F8BBA842ECF85"),
    "secret_key": os.getenv("MOMO_SECRET_KEY", "K951B6PE1waDMi640xX08PD3vg6EkVlz"),
    "api_url": os.getenv("MOMO_API_URL", "https://test-payment.momo.vn/gw_payment/transactionProcessor"),
    "return_url": os.getenv("MOMO_RETURN_URL", "http://localhost:8000/api/v1/momo/return/"),
    "notify_url": os.getenv("MOMO_NOTIFY_URL", "http://localhost:8000/api/v1/momo/notify/"),
}


def _sign(data: str, secret_key: str) -> str:
    return hmac.new(
        secret_key.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def create_momo_payment(order_id: int, amount: int, order_info: str = "") -> dict:
    """
    Tạo request thanh toán MoMo v1 (captureMoMoWallet).
    orderId gửi MoMo là UUID duy nhất mỗi lần; Django order_id lưu trong extraData.
    Trả về dict từ MoMo, bao gồm `payUrl` khi thành công (errorCode == 0).
    """
    cfg = MOMO_CONFIG
    momo_order_id = f"ORD{order_id}-{uuid.uuid4().hex[:12]}"
    request_id = momo_order_id

    # Lưu Django order_id vào extraData (base64 để tránh ký tự đặc biệt)
    extra_data = base64.b64encode(str(order_id).encode()).decode()

    if not order_info:
        order_info = f"Thanh toan don hang {order_id}"

    raw_signature = (
        f"partnerCode={cfg['partner_code']}"
        f"&accessKey={cfg['access_key']}"
        f"&requestId={request_id}"
        f"&amount={amount}"
        f"&orderId={momo_order_id}"
        f"&orderInfo={order_info}"
        f"&returnUrl={cfg['return_url']}"
        f"&notifyUrl={cfg['notify_url']}"
        f"&extraData={extra_data}"
    )

    signature = _sign(raw_signature, cfg["secret_key"])

    payload = {
        "partnerCode": cfg["partner_code"],
        "accessKey": cfg["access_key"],
        "requestId": request_id,
        "amount": str(amount),
        "orderId": momo_order_id,
        "orderInfo": order_info,
        "returnUrl": cfg["return_url"],
        "notifyUrl": cfg["notify_url"],
        "extraData": extra_data,
        "requestType": "captureMoMoWallet",
        "signature": signature,
    }

    print("[MoMo] raw_signature:", raw_signature)
    print("[MoMo] signature:", signature)
    print("[MoMo] payload:", payload)

    response = requests.post(cfg["api_url"], json=payload, timeout=15)
    result = response.json()
    print("[MoMo] response:", result)
    return result


def extract_django_order_id(params: dict) -> Optional[str]:
    """
    Lấy Django order_id từ extraData trong callback MoMo.
    extraData được encode base64 từ str(order_id).
    Fallback về orderId nếu extraData không hợp lệ.
    """
    extra_data = params.get("extraData", "")
    if extra_data:
        try:
            return base64.b64decode(extra_data.encode()).decode()
        except Exception:
            pass
    # Fallback: parse orderId dạng "ORD7-xxxx" -> "7"
    momo_order_id = params.get("orderId", "")
    if momo_order_id.startswith("ORD"):
        parts = momo_order_id[3:].split("-")
        if parts:
            return parts[0]
    return momo_order_id


def verify_momo_signature(params: dict, secret_key: Optional[str] = None) -> bool:
    """
    Xác thực chữ ký MoMo trên callback (return / notify).
    `params` là dict query string (return) hoặc JSON body (notify).
    """
    if secret_key is None:
        secret_key = MOMO_CONFIG["secret_key"]

    received_signature = params.get("signature", "")
    extra_data = params.get("extraData", "")

    raw_signature = (
        f"partnerCode={params.get('partnerCode', '')}"
        f"&accessKey={params.get('accessKey', '')}"
        f"&requestId={params.get('requestId', '')}"
        f"&amount={params.get('amount', '')}"
        f"&orderId={params.get('orderId', '')}"
        f"&orderInfo={params.get('orderInfo', '')}"
        f"&orderType={params.get('orderType', '')}"
        f"&transId={params.get('transId', '')}"
        f"&message={params.get('message', '')}"
        f"&localMessage={params.get('localMessage', '')}"
        f"&responseTime={params.get('responseTime', '')}"
        f"&errorCode={params.get('errorCode', '')}"
        f"&payType={params.get('payType', '')}"
        f"&extraData={extra_data}"
    )

    expected_signature = _sign(raw_signature, secret_key)
    print("[MoMo Verify] raw_signature:", raw_signature)
    print("[MoMo Verify] expected:", expected_signature)
    print("[MoMo Verify] received:", received_signature)
    return expected_signature == received_signature
