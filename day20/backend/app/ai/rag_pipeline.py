"""Day 20 RAG Pipeline: Document Chunking, ChromaDB Vector Store & Semantic Retrieval.

Implements document chunking via LangChain text splitters, vector indexing
into a persistent ChromaDB database, and relevance-scored semantic retrieval
grounded directly in the Nexora product catalog.
"""

import logging
from pathlib import Path
from typing import Any, Optional

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sqlalchemy.orm import Session

from app.config import settings
from app.models.product import Product

logger = logging.getLogger("nexora.rag")

# Seed catalog for initial indexing or offline test environments
FALLBACK_CATALOG_DATA: list[dict[str, Any]] = [
    {
        "id": 1,
        "name": "Sony WH-1000XM5 Wireless Headphones",
        "description": "Industry-leading noise cancelling with Auto NC Optimizer, 30-hour battery life, ultra-comfortable lightweight design, crystal clear hands-free calling with 4 beamforming microphones.",
        "price": 399.99,
        "stock": 42,
        "category": "Audio",
        "image_url": "/uploads/products/csv_sony_wh_1000xm5_wireless_1d15e88f.jpg",
    },
    {
        "id": 2,
        "name": "Apple MacBook Air M3 (15-inch)",
        "description": "Supercharged by Apple M3 chip with an 8-core CPU and 10-core GPU, up to 18 hours of battery life, striking Liquid Retina display supporting 1 billion colors, MagSafe 3 charging port.",
        "price": 1299.00,
        "stock": 18,
        "category": "Computers",
        "image_url": "/uploads/products/csv_macbook_air_m3_15_inch_1f01098e.jpg",
    },
    {
        "id": 3,
        "name": "Apple iPhone 16 Pro Max (256GB)",
        "description": "Grade 5 titanium design with Camera Control button, 48MP Fusion camera with 5x optical telephoto lens, A18 Pro chip with Apple Intelligence, ceramic shield front.",
        "price": 1199.99,
        "stock": 25,
        "category": "Smartphones",
        "image_url": "/uploads/products/csv_iphone_16_pro_max_1d15f496.jpg",
    },
    {
        "id": 4,
        "name": "Bose QuietComfort Ultra Headphones",
        "description": "Breakthrough spatialized audio with Bose Immersive Audio, world-class active noise cancellation, CustomTune technology adapts sound to your ears, up to 24 hours playtime.",
        "price": 429.00,
        "stock": 15,
        "category": "Audio",
        "image_url": "/uploads/products/csv_bose_quietcomfort_ultra_0a9d3579.jpg",
    },
    {
        "id": 5,
        "name": "Samsung Galaxy S25 Ultra (512GB)",
        "description": "Snapdragon 8 Elite Mobile Platform, 200MP wide sensor, built-in S-Pen stylus, Galaxy AI real-time translation and Generative Edit, Titanium frame and Corning Gorilla Armor.",
        "price": 1399.99,
        "stock": 30,
        "category": "Smartphones",
        "image_url": "/uploads/products/csv_samsung_galaxy_s25_ultra_0667cda8.jpg",
    },
    {
        "id": 6,
        "name": "Dell UltraSharp 32-inch 4K UHD Monitor",
        "description": "IPS Black technology with 2000:1 contrast ratio, 98% DCI-P3 color coverage, USB-C Hub with 90W power delivery, HDMI 2.1, DisplayPort 1.4, height-adjustable stand.",
        "price": 799.50,
        "stock": 12,
        "category": "Monitors",
        "image_url": "/uploads/products/csv_csv_image_4k_display_1849ffa1.jpg",
    },
]


class RagPipeline:
    """End-to-end LangChain and ChromaDB Retrieval-Augmented Generation pipeline."""

    COLLECTION_NAME: str = "nexora_products"

    def __init__(self, persist_dir: Optional[Path] = None):
        self.persist_dir = persist_dir or settings.CHROMA_PERSIST_DIR
        self.persist_dir.mkdir(parents=True, exist_ok=True)

        self._client: Optional[ClientAPI] = None
        self._collection: Optional[Collection] = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.RAG_CHUNK_SIZE,
            chunk_overlap=settings.RAG_CHUNK_OVERLAP,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    @property
    def client(self) -> ClientAPI:
        """Lazily initialize persistent ChromaDB client."""
        if self._client is None:
            self._client = chromadb.PersistentClient(path=str(self.persist_dir))
        return self._client

    @property
    def collection(self) -> Collection:
        """Lazily initialize or retrieve the product catalog collection."""
        if self._collection is None:
            self._collection = self.client.get_or_create_collection(
                name=self.COLLECTION_NAME,
                metadata={"hnsw:space": "cosine", "description": "Nexora product catalog embeddings"},
            )
            # Auto-seed if collection is empty
            if self._collection.count() == 0:
                self._seed_default_catalog()
        return self._collection

    def _seed_default_catalog(self) -> None:
        """Seed default catalogue items so vector search immediately yields results."""
        docs: list[str] = []
        ids: list[str] = []
        metadatas: list[dict[str, Any]] = []

        for item in FALLBACK_CATALOG_DATA:
            doc_text = (
                f"Product: {item['name']}\n"
                f"Category: {item['category']}\n"
                f"Price: ${item['price']:.2f}\n"
                f"Stock: {item['stock']} units\n"
                f"Description: {item['description']}"
            )
            docs.append(doc_text)
            ids.append(f"prod_{item['id']}_seed")
            metadatas.append(
                {
                    "product_id": int(item["id"]),
                    "name": str(item["name"]),
                    "price": float(item["price"]),
                    "stock": int(item["stock"]),
                    "category": str(item["category"]),
                    "image_url": str(item.get("image_url") or ""),
                }
            )

        if docs and self._collection is not None:
            self._collection.upsert(documents=docs, ids=ids, metadatas=metadatas)
            logger.info("ChromaDB automatically seeded with %d default products", len(docs))

    def reindex_catalog(self, db: Optional[Session] = None) -> dict[str, Any]:
        """
        Extract real products from PostgreSQL, chunk lengthy specifications,
        and re-index embeddings into ChromaDB vector store.
        """
        coll = self.collection

        products: list[Product] = []
        if db is not None:
            try:
                products = db.query(Product).filter(Product.is_active == True).all()
            except Exception as exc:
                logger.warning("Database query failed during reindex: %s. Using fallback seed.", exc)

        items_to_index: list[dict[str, Any]] = []
        if products:
            for p in products:
                items_to_index.append(
                    {
                        "id": p.id,
                        "name": p.title,
                        "description": p.description or "",
                        "price": float(p.price),
                        "stock": int(p.stock),
                        "category": p.category or "General",
                        "image_url": p.image_url or "",
                    }
                )
        else:
            items_to_index = FALLBACK_CATALOG_DATA

        documents: list[str] = []
        ids: list[str] = []
        metadatas: list[dict[str, Any]] = []

        for item in items_to_index:
            base_content = (
                f"Product Title: {item['name']}\n"
                f"Category: {item['category']}\n"
                f"Price: ${item['price']:.2f}\n"
                f"Inventory Stock: {item['stock']} units\n"
                f"Description: {item['description']}"
            )
            # Apply LangChain RecursiveCharacterTextSplitter for chunking
            chunks = self.text_splitter.split_text(base_content)
            for c_idx, chunk in enumerate(chunks):
                chunk_id = f"prod_{item['id']}_chunk_{c_idx}"
                documents.append(chunk)
                ids.append(chunk_id)
                metadatas.append(
                    {
                        "product_id": int(item["id"]),
                        "name": str(item["name"]),
                        "price": float(item["price"]),
                        "stock": int(item["stock"]),
                        "category": str(item["category"]),
                        "image_url": str(item.get("image_url") or ""),
                        "chunk_index": c_idx,
                        "total_chunks": len(chunks),
                    }
                )

        # Upsert documents and embeddings
        if ids:
            coll.upsert(documents=documents, ids=ids, metadatas=metadatas)
            logger.info("Successfully indexed %d chunks across %d products", len(ids), len(items_to_index))

        return {
            "status": "success",
            "collection_name": self.COLLECTION_NAME,
            "products_processed": len(items_to_index),
            "chunks_indexed": len(ids),
            "total_vectors": coll.count(),
        }

    def search(self, query: str, top_k: Optional[int] = None) -> list[dict[str, Any]]:
        """
        Query ChromaDB for semantic relevance against the query.
        Returns deduplicated citations with relevance scores and snippets.
        """
        k = top_k or settings.RAG_TOP_K
        coll = self.collection

        total_count = coll.count()
        if total_count == 0:
            self._seed_default_catalog()
            total_count = coll.count()

        if total_count == 0:
            return []

        limit = min(k, total_count)
        results = coll.query(query_texts=[query], n_results=limit)

        citations: list[dict[str, Any]] = []
        seen_products: set[int] = set()

        docs_list = results.get("documents", [[]])[0]
        metadatas_list = results.get("metadatas", [[]])[0]
        distances_list = results.get("distances", [[]])[0]

        for doc, meta, dist in zip(docs_list, metadatas_list, distances_list):
            if not meta:
                continue

            product_id = meta.get("product_id")
            if product_id in seen_products:
                continue
            seen_products.add(product_id)

            # Cosine distance to similarity conversion: score in [0.0, 1.0]
            similarity = round(max(0.0, min(1.0, 1.0 - (float(dist) / 2.0))), 3)

            citations.append(
                {
                    "product_id": int(product_id),
                    "name": str(meta.get("name") or "Product"),
                    "price": float(meta.get("price", 0.0)),
                    "stock": int(meta.get("stock", 0)),
                    "category": str(meta.get("category", "General")),
                    "image_url": str(meta.get("image_url", "")),
                    "similarity_score": similarity,
                    "snippet": doc[:280].strip(),
                    "description": doc,
                }
            )

        return citations

    def get_stats(self) -> dict[str, Any]:
        """Return diagnostic metrics for the RAG pipeline."""
        count = self.collection.count()
        return {
            "collection_name": self.COLLECTION_NAME,
            "vector_count": count,
            "embedding_model": "all-MiniLM-L6-v2 (ONNX)",
            "persist_directory": str(self.persist_dir),
            "chunk_size": settings.RAG_CHUNK_SIZE,
            "chunk_overlap": settings.RAG_CHUNK_OVERLAP,
        }


# Global singleton instance
rag_pipeline = RagPipeline()
