"""Seed balanced, authentic Flipkart/Amazon/Meesho multi-category catalog into PostgreSQL."""

from app.database import SessionLocal
from app.models.product import Product
from app.ai.rag_pipeline import rag_pipeline
from app.ai.ai_cache import ai_cache_service
from app.utils.redis_client import redis_manager

catalog_data = [
    # 1. Electronics (Smartphones, Laptops, Monitors)
    (1, 'Apple MacBook Air 15-inch M3 512GB', 'Electronics', 1299.00, 20, 'Ultra-thin lightweight laptop with Liquid Retina display, 18-hour battery life, fanless silent design, and 1080p FaceTime HD camera.', '/uploads/products/csv_macbook_air_m3_15_inch_f8f7dd1c.jpg'),
    (2, 'Sony WH-1000XM5 Noise-Cancelling Headphones', 'Audio', 349.99, 42, 'Industry-leading noise cancelling wireless studio headphones with Auto NC Optimizer, 30-hour battery life, and crystal-clear voice calling.', '/uploads/products/csv_sony_wh_1000xm5_wireless_f0a7b1fe.jpg'),
    (3, 'Apple iPhone 16 Pro Max 256GB Titanium', 'Electronics', 1199.99, 28, 'Flagship smartphone with Grade 5 Titanium design, A18 Pro chip, 48MP Fusion camera system with 5x telephoto, and Camera Control.', '/uploads/products/csv_iphone_16_pro_max_c473c04e.jpg'),
    (6, 'Samsung Galaxy S25 Ultra 5G 512GB Titanium', 'Electronics', 1299.99, 25, 'Ultimate flagship with Snapdragon 8 Elite, built-in S Pen, 200MP pro camera with Galaxy AI, and glare-free Gorilla Armor glass.', '/uploads/products/csv_samsung_galaxy_s25_ultra_0667cda8.jpg'),
    (11, 'LG UltraGear 32-inch 4K UHD OLED 240Hz Monitor', 'Electronics', 899.99, 18, 'Next-gen 4K OLED gaming display with 0.03ms response time, VESA DisplayHDR True Black 400, and dual-mode 4K 240Hz / FHD 480Hz.', '/uploads/products/monitor.jpg'),

    # 2. Audio & Entertainment
    (12, 'Bose QuietComfort Ultra Noise-Cancelling Headphones', 'Audio', 379.00, 35, 'World-class spatial active noise cancellation with breakthrough Bose Immersive Audio and ultra-plush protein leather cushions.', '/uploads/products/csv_bose_quietcomfort_ultra_0a9d3579.jpg'),
    (16, 'Marshall Stanmore III Bluetooth Home Speaker', 'Audio', 379.99, 22, 'Iconic retro home speaker with wide stereo soundstage, dynamic loudness balancing, Bluetooth 5.2, and textured brass-accented cabinet.', '/uploads/products/headphones.jpg'),
    (17, 'Apple AirPods Pro 2 with USB-C MagSafe Case', 'Audio', 249.00, 45, 'Pro-level Active Noise Cancellation with Adaptive Audio, Transparency mode, Personalized Spatial Audio, and up to 30 hours listening time.', '/uploads/products/csv_csv_image_studio_headpho_be1f4a1c.png'),

    # 3. Fashion & Apparel (Flipkart / Myntra Style)
    (22, 'Nike Air Jordan 1 Retro High OG Sneakers', 'Fashion', 179.99, 25, 'Iconic high-top basketball streetwear sneakers with genuine leather upper, encapsulated Nike Air cushioning, and rubber cupsole.', '/uploads/products/keyboard.jpg'),
    (23, 'Levis 511 Slim Fit Stretch Denim Jeans', 'Fashion', 59.99, 38, 'Classic modern slim-fit jeans with room to move, premium stretch denim fabric, zip fly, and signature 5-pocket styling.', '/uploads/products/keyboard.jpg'),
    (24, 'Mens Oversized Heavyweight Fleece Hoodie', 'Fashion', 44.99, 45, 'Trendy streetwear pullover hoodie made from 400 GSM brushed fleece cotton with drop shoulders, kangaroo pocket, and ribbed cuffs.', '/uploads/products/keyboard.jpg'),
    (25, 'Womens Pure Mulberry Silk Handloom Saree', 'Fashion', 89.00, 20, 'Authentic traditional handwoven silk saree with rich zari border, contrasting pallu, and matching unstitched blouse piece.', '/uploads/products/keyboard.jpg'),
    (26, 'Ray-Ban Classic Polarized Aviator Sunglasses', 'Fashion', 163.00, 30, 'Timeless metal frame teardrop sunglasses featuring polarized crystal green G-15 lenses with 100% UV protection and glare blocking.', '/uploads/products/keyboard.jpg'),

    # 4. Home, Kitchen & Living (Amazon Basics Style)
    (27, 'DeLonghi Dedica Deluxe Compact Espresso Machine', 'Home & Kitchen', 199.95, 18, 'Slim 15-bar pump espresso and cappuccino maker with manual adjustable milk frother, rapid heating system, and stainless steel housing.', '/uploads/products/laptop.jpg'),
    (28, 'Instant Vortex 6-in-1 Digital Air Fryer Oven 6-Qt', 'Home & Kitchen', 89.99, 32, 'Healthy countertop convection air fryer with EvenCrisp technology, 6 one-touch cooking programs, non-stick dishwasher-safe basket.', '/uploads/products/laptop.jpg'),
    (29, 'Ergonomic Memory Foam Mesh High-Back Office Chair', 'Home & Kitchen', 149.00, 22, 'Breathable mesh executive desk chair with adaptive lumbar support, 3D adjustable armrests, recline lock, and silent PU caster wheels.', '/uploads/products/laptop.jpg'),
    (30, 'Philips Smart Wi-Fi LED Ambient Floor Lamp', 'Home & Kitchen', 59.99, 28, 'Color-changing modern standing lamp with 16 million colors, warm-to-cool white light, app remote control, and voice assistant support.', '/uploads/products/csv_csv_image_4k_display_f3105e1d.jpg'),
    (31, 'Ninja Professional 1000W Countertop Smoothie Blender', 'Home & Kitchen', 79.99, 25, 'High-powered personal and family blender with Total Crushing blades, 72 oz pitcher, and powerful ice-crushing performance.', '/uploads/products/laptop.jpg'),

    # 5. Beauty & Personal Care (Meesho / Nykaa Style)
    (32, 'Minimalist 10% Vitamin C Face Brightening Serum', 'Beauty & Personal Care', 18.99, 50, 'Non-irritating dermatologically tested facial serum formulated with Centella Asiatica water to fade pigmentation and boost glow.', '/uploads/products/keyboard.jpg'),
    (33, 'Dyson Supersonic Intelligent Heat Hair Dryer', 'Beauty & Personal Care', 399.00, 15, 'Fast drying engineered with the Dyson digital motor V9, intelligent heat control to protect hair shine, and 5 styling magnetic attachments.', '/uploads/products/headphones.jpg'),
    (34, 'Forest Essentials Ayurvedic Day & Night Facial Cream Kit', 'Beauty & Personal Care', 42.00, 30, 'Luxurious Ayurvedic skincare duo infused with pure sandalwood, saffron, and natural almond oil for deeply nourished radiant skin.', '/uploads/products/keyboard.jpg'),
    (35, 'Philips Norelco All-in-One Multi-Grooming Trimmer', 'Beauty & Personal Care', 34.99, 45, 'Precision beard, hair, and body trimmer with self-sharpening DualCut steel blades, 13 guard attachments, and 60-min lithium run time.', '/uploads/products/keyboard.jpg'),

    # 6. Fitness, Health & Sports
    (36, 'Optimum Nutrition Gold Standard 100% Whey Protein 5 lbs', 'Fitness & Sports', 64.99, 40, 'Worlds bestselling post-workout recovery powder delivering 24g of whey isolate protein, 5.5g naturally occurring BCAAs per scoop.', '/uploads/products/headphones.jpg'),
    (37, 'Bowflex SelectTech 552 Adjustable Smart Dumbbells Pair', 'Fitness & Sports', 349.00, 15, 'Space-saving home gym dumbbells adjustable from 5 to 52.5 lbs with a simple dial turn, replacing 15 sets of traditional weights.', '/uploads/products/keyboard.jpg'),
    (38, 'Lululemon Reversible 5mm Anti-Slip Exercise Yoga Mat', 'Fitness & Sports', 78.00, 25, 'High-density natural rubber cushioned workout mat with polyurethane top layer that absorbs sweat for superior grip during hot yoga.', '/uploads/products/keyboard.jpg')
]

if __name__ == '__main__':
    with SessionLocal() as db:
        for item in catalog_data:
            p_id, name, cat, price, stock, desc, img = item
            prod = db.query(Product).filter(Product.id == p_id).first()
            if prod:
                prod.name = name
                prod.category = cat
                prod.price = price
                prod.stock = stock
                prod.description = desc
                prod.image_url = img
        db.commit()
        print('Updated 25 products across Electronics, Audio, Fashion, Home & Kitchen, Beauty, and Fitness!')

        summary = rag_pipeline.reindex_catalog(db=db)
        print(f"ChromaDB vector store re-indexed: {summary.get('chunks_indexed', 0)} chunks")

    redis_manager.invalidate_product_cache()
    ai_cache_service.clear()
    print('Redis catalog cache & AI response cache invalidated successfully.')
