"""Day 20 AI Prompt Engineering & LangChain Prompt Templates.

Defines reusable, hardened system prompts designed for RAG product recommendation
and grounded customer support. Strictly instructs the model to adhere only to retrieved
product catalog context, prevent hallucinations, and format answers clearly.
"""

from typing import Any
from langchain_core.prompts import (
    ChatPromptTemplate,
    HumanMessagePromptTemplate,
    MessagesPlaceholder,
    SystemMessagePromptTemplate,
)
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

SYSTEM_RAG_PROMPT: str = """You are Nexora AI, the intelligent, helpful, and strictly factual shopping assistant for the Nexora E-Commerce Store.

CRITICAL INSTRUCTIONS & GUARDRAILS:
1. GROUNDEDNESS: You MUST answer the user's questions based EXCLUSIVELY on the provided PRODUCT CATALOG CONTEXT below.
2. CITATIONS: Whenever you mention or recommend a product, explicitly include its exact name, product ID, and price (e.g., "[Product #1: Sony WH-1000XM5 - $399.99]").
3. MISSING INFORMATION: If the requested product, specification, or brand is NOT found in the provided context, you MUST state clearly and politely:
   "I cannot find that product or specification in our catalog. Currently available items are listed in the search results."
   Do NOT invent, guess, or assume specifications, pricing, stock levels, or warranty terms.
4. SPECIFICATIONS: When comparing items or listing details, use bullet points for readability.
5. TONE: Professional, concise, friendly, and shopping-oriented.

---
RETRIEVED PRODUCT CATALOG CONTEXT:
{context}
---
"""

USER_QUERY_TEMPLATE: str = """User Question: {question}

Please answer the question using ONLY the retrieved product catalog context provided in your instructions. Mention relevant products with their IDs and prices."""


def format_product_context(retrieved_items: list[dict[str, Any]]) -> str:
    """
    Format retrieved product documents into clean, structured Markdown blocks
    to inject into the LLM system prompt context window.
    """
    if not retrieved_items:
        return "No matching products were found in the catalog for this query."

    lines: list[str] = []
    for idx, item in enumerate(retrieved_items, start=1):
        p_id = item.get("product_id") or item.get("id") or "N/A"
        name = item.get("name") or "Unnamed Product"
        price = item.get("price", 0.0)
        stock = item.get("stock", 0)
        category = item.get("category", "General")
        desc = item.get("description", "No description provided.")
        similarity = item.get("similarity_score", 0.0)

        block = (
            f"[Item #{idx}]\n"
            f"• Product ID: {p_id}\n"
            f"• Name: {name}\n"
            f"• Price: ${price:.2f}\n"
            f"• Stock Available: {stock} units\n"
            f"• Category: {category}\n"
            f"• Relevance Score: {similarity:.2f}\n"
            f"• Overview: {desc}\n"
        )
        lines.append(block)

    return "\n".join(lines)


def get_langchain_rag_prompt_template() -> ChatPromptTemplate:
    """
    Create a modular LangChain ChatPromptTemplate configured with system instructions,
    retrieved catalog context, chat history placeholder, and user query.
    """
    return ChatPromptTemplate.from_messages(
        [
            SystemMessagePromptTemplate.from_template(SYSTEM_RAG_PROMPT),
            MessagesPlaceholder(variable_name="history", optional=True),
            HumanMessagePromptTemplate.from_template(USER_QUERY_TEMPLATE),
        ]
    )


def build_rag_chain_messages(
    question: str,
    context: str,
    history: list[dict[str, str]] | None = None,
) -> list[dict[str, str]]:
    """
    Build standard message dictionaries for direct LLM API calls and LangChain pipelines.
    Converts conversation history safely into role/content pairs.
    """
    system_text = SYSTEM_RAG_PROMPT.format(context=context)
    user_text = USER_QUERY_TEMPLATE.format(question=question)

    messages: list[dict[str, str]] = [
        {"role": "system", "content": system_text}
    ]

    if history:
        for entry in history:
            role = entry.get("role", "user")
            content = entry.get("content", "")
            if role in ("user", "human"):
                messages.append({"role": "user", "content": content})
            elif role in ("assistant", "ai"):
                messages.append({"role": "assistant", "content": content})

    messages.append({"role": "user", "content": user_text})
    return messages
