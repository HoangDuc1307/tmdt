from django.apps import AppConfig
import sys


class ChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'chatbot'

    def ready(self):
        # Chỉ preload RAG khi chạy runserver (prepare_knowledge_base_sync đã gọi fetch DB bên trong)
        if "runserver" in sys.argv:
            from .chat_utils import prepare_knowledge_base_sync

            prepare_knowledge_base_sync()
