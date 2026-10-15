"""Seed authentic Amazon/Flipkart-style electronics catalog into PostgreSQL and re-index ChromaDB."""

from app.database import SessionLocal
from app.models.product import Product
from app.ai.rag_pipeline import rag_pipeline
from app.ai.ai_cache import ai_cache_service
from app.utils.redis_client import redis_manager

catalog_data = [
    (1, 'Apple MacBook Pro 16-inch M3 Pro', 'Laptops & Computers', 2499.00, 18, 'Flagship Apple Silicon laptop with 16-inch Liquid Retina XDR display, 36GB unified memory, and 22-hour battery life.', '/uploads/products/laptop.jpg'),
    (2, 'Sony WH-1000XM5 Noise-Cancelling Headphones', 'Audio & Headphones', 349.99, 42, 'Industry-leading noise cancelling studio headphones with Auto NC Optimizer, 30-hour battery life, and crystal-clear hands-free calling.', '/uploads/products/csv_sony_wh_1000xm5_wireless_f0a7b1fe.jpg'),
    (3, 'Keychron Q1 Pro Wireless Mechanical Keyboard', 'Gaming & Accessories', 199.00, 35, 'Custom QMK/VIA wireless mechanical keyboard with CNC aluminum body, hot-swappable switches, and south-facing RGB backlighting.', '/uploads/products/keyboard.jpg'),
    (6, 'Razer BlackWidow V4 Pro Mechanical Gaming Keyboard', 'Gaming & Accessories', 229.99, 28, 'Command center gaming keyboard with dedicated macro keys, magnetic wrist rest, and yellow linear mechanical switches.', '/uploads/products/keyboard.jpg'),
    (11, 'Dell UltraSharp 32-inch 4K USB-C Hub Monitor', 'Displays & Monitors', 799.00, 20, 'Premier 4K UHD color-accurate IPS Black monitor with 90W USB-C power delivery, RJ45 Ethernet, and factory color calibration.', '/uploads/products/monitor.jpg'),
    (12, 'Logitech MX Master 3S Wireless Performance Mouse', 'Gaming & Accessories', 99.99, 45, 'Ergonomic precision mouse with 8K DPI sensor, quiet click switches, MagSpeed electromagnetic scroll wheel, and USB-C quick charge.', '/uploads/products/keyboard.jpg'),
    (16, 'Google Pixel 9 Pro XL 5G Smartphone', 'Smartphones & Tablets', 1099.00, 22, 'Google flagship smartphone with Tensor G4 processor, Super Actua display, Pro triple camera with 30x Super Res Zoom, and Gemini AI built-in.', '/uploads/products/csv_iphone_16_pro_max_c473c04e.jpg'),
    (17, 'Apple Watch Ultra 2 GPS + Cellular 49mm', 'Wearables & Smart Tech', 799.00, 30, 'Rugged titanium smartwatch for athletes and outdoor explorers, featuring dual-frequency GPS, 3000-nit Retina display, and 36-hour battery.', '/uploads/products/keyboard.jpg'),
    (22, 'Apple iPhone 16 Pro Max 256GB Titanium', 'Smartphones & Tablets', 1199.99, 30, 'Flagship smartphone featuring Grade 5 Titanium design, A18 Pro chip, 48MP Fusion camera system with 5x telephoto, and Camera Control button.', '/uploads/products/csv_iphone_16_pro_max_c473c04e.jpg'),
    (23, 'Shure MV7+ USB/XLR Podcast Microphone', 'Audio & Headphones', 279.00, 35, 'Professional hybrid podcast and streaming microphone with onboard DSP, auto level mode, customizable LED touch panel, and XLR/USB outputs.', '/uploads/products/headphones.jpg'),
    (24, 'Samsung Odyssey Neo G9 49-inch Curved Gaming Monitor', 'Displays & Monitors', 1499.00, 14, 'Dual QHD 240Hz super ultrawide curved monitor with Quantum Mini-LED technology, 1ms response time, and AMD FreeSync Premium Pro.', '/uploads/products/monitor.jpg'),
    (25, 'Apple MacBook Air 15-inch M3 512GB', 'Laptops & Computers', 1299.00, 25, 'Ultra-thin, light laptop with 15.3-inch Liquid Retina display, 18-hour battery life, fanless silent operation, and 1080p FaceTime HD camera.', '/uploads/products/csv_macbook_air_m3_15_inch_f8f7dd1c.jpg'),
    (26, 'Bose QuietComfort Ultra Noise-Cancelling Headphones', 'Audio & Headphones', 379.00, 38, 'World-class active noise cancellation with breakthrough Bose Immersive Audio, custom acoustic tuning, and ultra-plush protein leather cushions.', '/uploads/products/csv_bose_quietcomfort_ultra_0a9d3579.jpg'),
    (27, 'SteelSeries Apex Pro TKL Wireless Gaming Keyboard', 'Gaming & Accessories', 249.99, 25, 'The worlds fastest keyboard with OmniPoint 2.0 adjustable hyper-magnetic switches, OLED smart display, and aircraft-grade aluminum build.', '/uploads/products/keyboard.jpg'),
    (28, 'LG UltraGear 32-inch 4K UHD OLED 240Hz Monitor', 'Displays & Monitors', 899.99, 18, 'Next-generation 4K OLED gaming display with 0.03ms response time, VESA DisplayHDR True Black 400, and dual-mode 4K 240Hz / FHD 480Hz.', '/uploads/products/monitor.jpg'),
    (29, 'Sennheiser Momentum 4 Wireless Studio Headphones', 'Audio & Headphones', 299.99, 26, 'Audiophile-inspired sound with 42mm transducer system, adaptive noise cancellation, and outstanding 60-hour marathon battery life.', '/uploads/products/csv_csv_image_studio_headpho_be1f4a1c.png'),
    (30, 'ASUS ProArt 32-inch 4K Color-Accurate Professional Display', 'Displays & Monitors', 699.00, 16, 'Hardware-calibrated professional monitor with 100% sRGB, 99% DCI-P3 wide color gamut, Calman verified certification, and USB-C hub.', '/uploads/products/csv_csv_image_4k_display_f3105e1d.jpg'),
    (31, 'Marshall Stanmore III Bluetooth Home Speaker', 'Audio & Headphones', 379.99, 24, 'Iconic retro home speaker with wide stereo soundstage, dynamic loudness acoustic balancing, Bluetooth 5.2, and premium textured vinyl cabinet.', '/uploads/products/headphones.jpg'),
    (32, 'Sony PlayStation 5 Pro Console 2TB SSD', 'Gaming & Accessories', 699.99, 20, 'Next-gen console with PlayStation Spectral Super Resolution (PSSR), advanced ray tracing, 2TB high-speed SSD storage, and DualSense haptics.', '/uploads/products/keyboard.jpg'),
    (33, 'CalDigit TS4 Thunderbolt 4 18-Port Studio Dock', 'Gaming & Accessories', 399.99, 30, 'The ultimate docking station with 18 ports, 98W host laptop charging, 2.5GbE Ethernet, UHS-II SD card readers, and dual 6K display support.', '/uploads/products/laptop.jpg'),
    (34, 'Samsung Galaxy S25 Ultra 5G 512GB Titanium', 'Smartphones & Tablets', 1299.99, 25, 'Ultimate Android flagship with Snapdragon 8 Elite chip, built-in S Pen, 200MP pro camera with Galaxy AI, and Corning Gorilla Armor glass.', '/uploads/products/csv_samsung_galaxy_s25_ultra_0667cda8.jpg'),
    (35, 'Apple iPad Pro 13-inch M4 Ultra Retina XDR', 'Smartphones & Tablets', 1299.00, 22, 'Incredibly thin design featuring tandem OLED Ultra Retina XDR display, breakthrough M4 performance, and support for Apple Pencil Pro.', '/uploads/products/csv_apple_ipad_pro_m4_13_inc_2077eb77.jpg'),
    (36, 'Sony Alpha 7 IV Full-Frame Mirrorless Camera', 'Cameras & Photography', 2498.00, 15, 'Groundbreaking hybrid photo and video camera with 33MP Exmor R sensor, BIONZ XR processing, 4K 60p 10-bit recording, and real-time eye AF.', '/uploads/products/headphones.jpg'),
    (37, 'DJI Mini 4 Pro 4K Drone with RC 2 Controller', 'Cameras & Photography', 959.00, 20, 'Under 249g ultra-portable drone with 4K/60fps HDR true vertical shooting, omnidirectional obstacle sensing, and 20km FHD video transmission.', '/uploads/products/laptop.jpg'),
    (38, 'ASUS ROG Swift 34-inch QD-OLED Curved Gaming Monitor', 'Displays & Monitors', 1199.00, 12, 'Ultrawide 3440x1440 curved gaming monitor with Quantum Dot OLED panel, 175Hz refresh rate, custom heatsink, and graphene film protection.', '/uploads/products/monitor.jpg')
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
        print('Updated all 25 products with authentic Flipkart/Amazon tech catalog entries.')

        summary = rag_pipeline.reindex_catalog(db=db)
        print(f"ChromaDB vector store re-indexed: {summary.get('chunks_indexed', 0)} chunks")

    redis_manager.invalidate_product_cache()
    ai_cache_service.clear()
    print('Redis catalog cache & AI response cache invalidated successfully.')
