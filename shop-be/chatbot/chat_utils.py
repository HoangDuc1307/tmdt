import os
from dotenv import load_dotenv
import psycopg2
import sqlite3
from pydantic import SecretStr
from langchain_openai import ChatOpenAI
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.documents import Document


# ==================== ENV ====================
load_dotenv()
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
openrouter_model = os.getenv("OPENROUTER_MODEL")
llm_enabled = bool(openrouter_api_key and openrouter_model)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQLITE_DB_PATH = os.path.join(BASE_DIR, "db.sqlite3")
#db_host = os.getenv("DB_HOST")
#db_port = os.getenv("DB_PORT")
#db_name = os.getenv("DB_NAME")
#db_user = os.getenv("DB_USER")
#db_password = os.getenv("DB_PASSWORD")


# ==================== LLM ====================
llm = None
if llm_enabled:
    llm = ChatOpenAI(
        model=openrouter_model,
        temperature=0.03,
        api_key=SecretStr(openrouter_api_key),
        base_url="https://openrouter.ai/api/v1",
    )


# ==================== GLOBAL STATE ====================
knowledge_base = None
is_rag_ready = False
global_chat_history = []
global_embeddings = None


# ==================== DATABASE LOADER ====================
def fetch_data_from_database(user_id=None):
    db_documents = []
    #if not all([db_host, db_name, db_user, db_password, db_port]):
    if not os.path.exists(SQLITE_DB_PATH):
        print("Invalid database configuration in .env")
        return db_documents

    conn = None
    try:
        #conn = psycopg2.connect(
        #    host=db_host,
        #    database=db_name,
        #    user=db_user,
        #    password=db_password,
        #    port=db_port
        #)
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cur = conn.cursor()

        sql_query = """
        SELECT p.id, p.name, p.description, p.price, p.created_at, c.name as category,
               CASE 
                   WHEN sp.discount_percent IS NOT NULL 
                   AND sp.start_date <= CURRENT_TIMESTAMP 
                   AND sp.end_date >= CURRENT_TIMESTAMP 
                   THEN p.price * (100 - sp.discount_percent) / 100
                   ELSE p.price 
               END as current_price,
               COALESCE(sp.discount_percent, 0) as discount_percent
        FROM products_product p
        LEFT JOIN products_category c ON p.category_id = c.id
        LEFT JOIN saleproduct_saleproduct sp ON p.id = sp.product_id;
        """
        cur.execute(sql_query)
        rows = cur.fetchall()

        for row in rows:
            product_id, name, description, price, created_at, category, current_price, discount_percent = row
            content = (
                f"Tên: {name}.\n"
                f"Mô tả: {description}.\n"
                f"Giá hiện tại: {current_price}.\n"
                f"Giảm giá: {discount_percent}%.\n"
                f"Danh mục: {category}.\n"
            )
            metadata = {"source": "database", "table": "products", "name": name}
            db_documents.append(Document(page_content=content, metadata=metadata))

        cur.close()
        print(f"Loaded {len(db_documents)} documents from database.")

    except Exception as e:
        print(f"Database query error: {e}")
    finally:
        if conn:
            conn.close()

    return db_documents


# ==================== KNOWLEDGE BASE ====================
def prepare_knowledge_base_sync(data_dir="data"):
    global knowledge_base, is_rag_ready, global_embeddings
    print("Skip loading local RAG model due to memory limits. Using basic cloud LLM mode.")
    is_rag_ready = False
    return


# ==================== DB CONTEXT (thay thế RAG khi is_rag_ready=False) ====================
_PRODUCT_KEYWORDS = [
    "sản phẩm", "hàng", "giá", "mua", "bán", "có không", "còn không",
    "danh mục", "loại", "mẫu", "giảm giá", "khuyến mãi", "sale",
    "đắt", "rẻ", "bao nhiêu tiền", "chất lượng", "thương hiệu",
    "laptop", "điện thoại", "máy tính", "phụ kiện", "áo", "quần",
    "giày", "túi", "đồng hồ", "tai nghe", "camera", "tivi", "tủ lạnh",
]

def _is_product_question(user_message: str) -> bool:
    lower = user_message.lower()
    return any(kw in lower for kw in _PRODUCT_KEYWORDS)


def fetch_products_by_keyword(keyword: str, limit: int = 15) -> str:
    """
    Tìm sản phẩm theo từ khóa trong tên/mô tả/danh mục bằng SQL LIKE.
    Trả về chuỗi context để nhét vào prompt.
    """
    if not os.path.exists(SQLITE_DB_PATH):
        return ""
    conn = None
    try:
        conn = sqlite3.connect(SQLITE_DB_PATH)
        cur = conn.cursor()
        like = f"%{keyword}%"
        sql = """
        SELECT p.name, p.description, c.name as category,
               CASE
                   WHEN sp.discount_percent IS NOT NULL
                   AND sp.start_date <= CURRENT_TIMESTAMP
                   AND sp.end_date >= CURRENT_TIMESTAMP
                   THEN p.price * (100 - sp.discount_percent) / 100
                   ELSE p.price
               END as current_price,
               COALESCE(sp.discount_percent, 0) as discount_percent,
               p.quantity
        FROM products_product p
        LEFT JOIN products_category c ON p.category_id = c.id
        LEFT JOIN saleproduct_saleproduct sp ON p.id = sp.product_id
        WHERE p.is_approved = 1
          AND (p.name LIKE ? OR p.description LIKE ? OR c.name LIKE ?)
        LIMIT ?
        """
        cur.execute(sql, (like, like, like, limit))
        rows = cur.fetchall()
        cur.close()

        if not rows:
            # Fallback: lấy tất cả sản phẩm approved nếu không khớp từ khóa
            cur2 = conn.cursor()
            cur2.execute("""
            SELECT p.name, p.description, c.name, 
                   CASE WHEN sp.discount_percent IS NOT NULL
                        AND sp.start_date <= CURRENT_TIMESTAMP
                        AND sp.end_date >= CURRENT_TIMESTAMP
                   THEN p.price * (100 - sp.discount_percent) / 100
                   ELSE p.price END,
                   COALESCE(sp.discount_percent, 0), p.quantity
            FROM products_product p
            LEFT JOIN products_category c ON p.category_id = c.id
            LEFT JOIN saleproduct_saleproduct sp ON p.id = sp.product_id
            WHERE p.is_approved = 1
            LIMIT ?
            """, (limit,))
            rows = cur2.fetchall()
            cur2.close()

        lines = []
        for name, desc, cat, price, discount, qty in rows:
            stock = "Còn hàng" if (qty or 0) > 0 else "Hết hàng"
            line = (
                f"- Tên: {name} | Danh mục: {cat} | Giá: {int(price):,}đ"
                + (f" (giảm {int(discount)}%)" if discount else "")
                + f" | {stock}"
                + (f" | Mô tả: {(desc or '')[:80]}" if desc else "")
            )
            lines.append(line)
        return "\n".join(lines)
    except Exception as e:
        print(f"[DB Context] Lỗi truy vấn: {e}")
        return ""
    finally:
        if conn:
            conn.close()


# QUESTION REWRITE
_CONTEXT_DEPENDENT_TERMS = [
    "nó", "đó", "cái đó", "mẫu đó", "loại đó", "sản phẩm đó",
    "vậy", "thế", "còn không", "thêm", "nữa", "bao nhiêu",
    "của nó", "giá đó", "cái này", "cái kia",
]

def _needs_rewrite(user_message: str, chat_history_parsed: list) -> bool:
    """Chỉ rewrite khi câu hỏi phụ thuộc ngữ cảnh trước đó."""
    has_ai_turn = any(isinstance(m, AIMessage) for m in chat_history_parsed)
    if not has_ai_turn:
        return False
    lower = user_message.lower().strip()
    return any(term in lower for term in _CONTEXT_DEPENDENT_TERMS)


def rewrite_user_question(user_message: str, chat_history_parsed: list[BaseMessage], max_turns=3):
    # Bỏ qua rewrite nếu câu hỏi độc lập — tiết kiệm 1 lần gọi LLM
    if not _needs_rewrite(user_message, chat_history_parsed):
        print("DEBUG - Skipping rewrite (standalone question)")
        return user_message

    total_messages = len(chat_history_parsed)
    ai_messages = [msg for msg in chat_history_parsed if isinstance(msg, AIMessage)]
    user_messages = [msg for msg in chat_history_parsed if isinstance(msg, HumanMessage)]
    print(f"DEBUG - Total messages: {total_messages}, AI: {len(ai_messages)}, User: {len(user_messages)}")

    filtered = []
    ai_count = 0
    user_count = 0
    for msg in reversed(chat_history_parsed):
        if isinstance(msg, (HumanMessage, AIMessage)):
            filtered.append(msg)
            if isinstance(msg, AIMessage):
                ai_count += 1
            elif isinstance(msg, HumanMessage):
                user_count += 1
            if ai_count >= max_turns and user_count >= max_turns:
                break
    filtered.reverse()

    history_lines = []
    for msg in filtered:
        role = "User" if isinstance(msg, HumanMessage) else "AI"
        history_lines.append(f"{role}: {msg.content}")
    history_text = "\n".join(history_lines)

    if ai_count == 0:
        prompt_text = (
            "Người dùng chỉ trả lời ngắn gọn. Dựa vào lịch sử hội thoại trước đó, hãy diễn giải lại câu hỏi của người dùng thành một câu hỏi rõ ràng, đầy đủ ngữ cảnh.\n"
            f"Lịch sử hội thoại:\n{history_text}\n"
            f"Câu hỏi của người dùng: {user_message}\n"
            "Câu hỏi đã diễn giải:"
        )
    else:
        prompt_text = (
            "Dựa vào đoạn hội thoại gần nhất giữa người dùng và AI dưới đây, hãy diễn giải lại câu hỏi của người dùng thành một câu hỏi rõ ràng, đầy đủ ngữ cảnh để AI có thể trả lời chính xác.\n"
            f"Đoạn hội thoại gần nhất:\n{history_text}\n"
            f"Câu hỏi của người dùng: {user_message}\n"
            "Câu hỏi đã diễn giải:"
        )

    try:
        response = llm.invoke([HumanMessage(content=prompt_text)])
        rewritten = (response.content or user_message).strip()
    except Exception as e:
        print(f"Rewrite error: {e}")
        return user_message

    print("Latest conversation context")
    print(history_text)
    print("Rewritten question:")
    print(rewritten)

    return rewritten


# ==================== CHATBOT RESPONSE ====================
def get_chatbot_response(user_message: str, chat_history_raw: list, user_id: int = None):
    user_input_lower = user_message.lower()

    # Business rules shortcut
    if any(keyword in user_input_lower for keyword in ["đổi hàng", "trả hàng", "hủy đơn", "đổi trả", "đổi sản phẩm", "bảo hành"]):
        return {
            "answer": (
                " Chính sách đổi/trả hàng và bảo hành cần xác nhận qua các hình thức sau.\n"
                " Hotline: 0909 123 456\n"
                " Zalo: https://zalo.me/yourshop\n"
                " Facebook: https://facebook.com/yourshop\n"
            )
        }

    global global_chat_history

    combined_history = global_chat_history.copy()
    combined_history.append({"role": "human", "content": user_message})

    # Do not block the whole backend when chatbot env is missing.
    if not llm_enabled or llm is None:
        return {
            "answer": (
                "Chatbot tam thoi chua duoc cau hinh OPENROUTER_API_KEY/OPENROUTER_MODEL. "
                "Ban van co the su dung day du cac chuc nang chinh cua san."
            )
        }

    # Parse history
    chat_history_parsed: list[BaseMessage] = []
    for msg in combined_history:
        if isinstance(msg, dict):
            role = msg.get("role")
            content = msg.get("content", "")
            if role == "human":
                chat_history_parsed.append(HumanMessage(content=content))
            elif role == "ai":
                chat_history_parsed.append(AIMessage(content=content))
            elif role == "system":
                chat_history_parsed.append(SystemMessage(content=content))
        elif isinstance(msg, str):
            chat_history_parsed.append(HumanMessage(content=msg))
        elif isinstance(msg, BaseMessage):
            chat_history_parsed.append(msg)

    try:
        user_message_rewritten = rewrite_user_question(user_message, chat_history_parsed)

        # Chỉ giữ 6 lượt hội thoại gần nhất khi gửi vào LLM (giảm token)
        system_msgs = [m for m in chat_history_parsed if isinstance(m, SystemMessage)]
        convo_msgs = [m for m in chat_history_parsed if isinstance(m, (HumanMessage, AIMessage))]
        trimmed_history = system_msgs + convo_msgs[-6:]

        # ================= RAG FLOW (FAISS embedding) =================
        if is_rag_ready and knowledge_base:
            print("Using RAG mode...")
            retriever = knowledge_base.as_retriever(search_kwargs={"k": 10})
            docs = retriever.invoke(user_message_rewritten)
            context_text = "\n\n".join(doc.page_content for doc in docs) if docs else "Không có dữ liệu liên quan."

            system_prompt = (
                "Bạn là trợ lý AI về sản phẩm, chỉ trả lời dựa trên dữ liệu được cung cấp, không được bịa thông tin. "
                "Nếu không có thông tin, hãy nói rõ. "
                "Nếu người dùng hỏi về sản phẩm, hãy trả lời tập trung vào tình trạng hàng, giá, mô tả, giảm giá (nếu có). "
                "Không trả lời thêm sản phẩm khác. Trả lời bằng tiếng Việt, đầy đủ và chính xác. "
                "Nếu không có thông tin sản phẩm, hãy gợi ý 1 sản phẩm cùng danh mục, chỉ cung cấp tên và giá. "
                "Nếu người dùng đồng ý xem thêm, hãy gợi ý 1–2 sản phẩm khác cùng danh mục, không lặp lại sản phẩm cũ."
            )
            messages = [
                SystemMessage(content=system_prompt),
                *trimmed_history,
                HumanMessage(content=f"Dữ liệu:\n{context_text}\n\nCâu hỏi: {user_message_rewritten}\n\nChỉ trả lời dựa trên dữ liệu trên.")
            ]
            llm_response = llm.invoke(messages)
            ai_response = llm_response.content

        # ================= DB CONTEXT FLOW (thay RAG khi không có embedding) =================
        elif _is_product_question(user_message_rewritten):
            print("Using DB context mode (no FAISS, query SQLite directly).")
            context_text = fetch_products_by_keyword(user_message_rewritten)
            if not context_text:
                context_text = "Hiện không có sản phẩm phù hợp trong hệ thống."

            system_prompt = (
                "Bạn là trợ lý AI tư vấn sản phẩm của shop. "
                "Chỉ trả lời dựa trên danh sách sản phẩm được cung cấp, không bịa thông tin. "
                "Trả lời bằng tiếng Việt, ngắn gọn, tập trung vào tên, giá, tình trạng hàng và giảm giá nếu có. "
                "Nếu không tìm thấy sản phẩm phù hợp, thông báo rõ và gợi ý danh mục khác."
            )
            messages = [
                SystemMessage(content=system_prompt),
                *trimmed_history,
                HumanMessage(content=f"Danh sách sản phẩm:\n{context_text}\n\nCâu hỏi: {user_message_rewritten}")
            ]
            llm_response = llm.invoke(messages)
            ai_response = llm_response.content

        # ================= FALLBACK FLOW (câu hỏi chung, không về sản phẩm) =================
        else:
            print("Using basic LLM mode (no RAG, no product question).")
            if not trimmed_history or trimmed_history[0].type != "system":
                trimmed_history.insert(
                    0, SystemMessage(content="Bạn là một trợ lý AI hữu ích và thân thiện của shop. Bạn sẽ trả lời bằng tiếng Việt.")
                )
            trimmed_history.append(HumanMessage(content=user_message_rewritten))
            llm_response = llm.invoke(trimmed_history)
            ai_response = llm_response.content

        global_chat_history.append({"role": "human", "content": user_message})
        global_chat_history.append({"role": "ai", "content": ai_response})
        if len(global_chat_history) > 24:
            global_chat_history = global_chat_history[-24:]

        return {"answer": ai_response}

    except Exception as e:
        print(f"LangChain/LLM processing error: {e}")
        return {"answer": "Xin lỗi, tôi đang gặp vấn đề nội bộ. Vui lòng thử lại sau."}
