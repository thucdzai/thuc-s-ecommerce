const db = require('../../config/db');

// ---------------------------------------------------------------------------
// Helpers dựng câu lệnh SQL động một cách an toàn (luôn dùng placeholder cho giá trị)
// ---------------------------------------------------------------------------
function buildListFilter({ categoryId, q, minPrice, maxPrice }) {
    const conditions = [`p.status = 'active'`];
    const params = [];

    if (categoryId) {
        conditions.push('p.category_id = ?');
        params.push(categoryId);
    }
    if (q) {
        conditions.push('p.name LIKE ?');
        params.push(`%${q}%`);
    }
    if (minPrice !== undefined) {
        conditions.push('v.price >= ?');
        params.push(minPrice);
    }
    if (maxPrice !== undefined) {
        conditions.push('v.price <= ?');
        params.push(maxPrice);
    }

    return { whereClause: `WHERE ${conditions.join(' AND ')}`, params };
}

// Khác buildListFilter (catalog công khai luôn khoá `status = 'active'`): admin cần thấy MỌI
// trạng thái để còn quản lý sản phẩm "Bản nháp"/"Ngừng bán" và mở bán lại — `status` ở đây chỉ
// là bộ lọc tùy chọn, để trống nghĩa là lấy tất cả.
function buildAdminListFilter({ status, categoryId, q }) {
    const conditions = [];
    const params = [];

    if (status) {
        conditions.push('p.status = ?');
        params.push(status);
    }
    if (categoryId) {
        conditions.push('p.category_id = ?');
        params.push(categoryId);
    }
    if (q) {
        conditions.push('p.name LIKE ?');
        params.push(`%${q}%`);
    }

    return { whereClause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

function mapAdminListRow(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        thumbnailUrl: row.thumbnail_url,
        status: row.status,
        categoryId: row.category_id,
        variantCount: Number(row.variant_count),
        priceFrom: row.min_price !== null ? Number(row.min_price) : null,
        priceTo: row.max_price !== null ? Number(row.max_price) : null,
    };
}

function buildOrderClause(sort) {
    switch (sort) {
        case 'price_asc':
            return 'ORDER BY min_price ASC';
        case 'price_desc':
            return 'ORDER BY min_price DESC';
        case 'name_asc':
            return 'ORDER BY p.name ASC';
        case 'newest':
        default:
            return 'ORDER BY p.created_at DESC';
    }
}

function mapListRow(row) {
    return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        thumbnailUrl: row.thumbnail_url,
        status: row.status,
        categoryId: row.category_id,
        priceFrom: Number(row.min_price),
        priceTo: Number(row.max_price),
    };
}

// ---------------------------------------------------------------------------
// Đọc dữ liệu (public)
// ---------------------------------------------------------------------------

// limit/offset đã được parsePagination() ép kiểu integer — an toàn để nội suy trực tiếp vào LIMIT/OFFSET
// (mysql2 prepared statements không hỗ trợ tốt placeholder ở mệnh đề LIMIT).
async function countListed(filters) {
    const { whereClause, params } = buildListFilter(filters);
    const [rows] = await db.query(
        `SELECT COUNT(DISTINCT p.id) AS total
         FROM products p
         JOIN variants v ON v.product_id = p.id
         ${whereClause}`,
        params
    );
    return rows[0].total;
}

async function listForCatalog(filters, { limit, offset }) {
    const { whereClause, params } = buildListFilter(filters);
    const orderClause = buildOrderClause(filters.sort);

    const [rows] = await db.query(
        `SELECT p.id, p.name, p.slug, p.thumbnail_url, p.status, p.category_id,
                MIN(v.price) AS min_price, MAX(v.price) AS max_price
         FROM products p
         JOIN variants v ON v.product_id = p.id
         ${whereClause}
         GROUP BY p.id
         ${orderClause}
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return rows.map(mapListRow);
}

// ---------------------------------------------------------------------------
// Đọc dữ liệu (admin) — KHÔNG lọc theo status: trang quản trị phải hiển thị đầy đủ sản phẩm
// "Bản nháp"/"Đang bán"/"Ngừng bán" để admin còn thấy và mở bán lại sản phẩm đã ngừng bán,
// khác hẳn trang danh mục công khai (chỉ hiện sản phẩm 'active' cho khách mua hàng).
// ---------------------------------------------------------------------------
async function countListedForAdmin(filters) {
    const { whereClause, params } = buildAdminListFilter(filters);
    const [rows] = await db.query(`SELECT COUNT(*) AS total FROM products p ${whereClause}`, params);
    return rows[0].total;
}

async function listForAdmin(filters, { limit, offset }) {
    const { whereClause, params } = buildAdminListFilter(filters);
    const [rows] = await db.query(
        `SELECT p.id, p.name, p.slug, p.thumbnail_url, p.status, p.category_id,
                COUNT(v.id) AS variant_count, MIN(v.price) AS min_price, MAX(v.price) AS max_price
         FROM products p
         LEFT JOIN variants v ON v.product_id = p.id
         ${whereClause}
         GROUP BY p.id
         ORDER BY p.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return rows.map(mapAdminListRow);
}

async function findById(id) {
    const [rows] = await db.execute('SELECT * FROM products WHERE id = ? LIMIT 1', [id]);
    return rows[0] || null;
}

async function findVariantsByProductId(productId) {
    const [rows] = await db.execute('SELECT * FROM variants WHERE product_id = ? ORDER BY id ASC', [productId]);
    return rows;
}

async function findDetailById(id) {
    const product = await findById(id);
    if (!product) return null;

    const [images] = await db.execute(
        'SELECT image_url, sort_order FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
        [id]
    );
    const variants = await findVariantsByProductId(id);

    let attributesByVariant = new Map();
    if (variants.length > 0) {
        const placeholders = variants.map(() => '?').join(',');
        const [attrRows] = await db.query(
            `SELECT variant_id, attribute_name, attribute_value
             FROM variant_attributes WHERE variant_id IN (${placeholders})`,
            variants.map((v) => v.id)
        );
        for (const row of attrRows) {
            if (!attributesByVariant.has(row.variant_id)) attributesByVariant.set(row.variant_id, {});
            attributesByVariant.get(row.variant_id)[row.attribute_name] = row.attribute_value;
        }
    }

    return {
        product,
        images,
        variants: variants.map((v) => ({ ...v, attributes: attributesByVariant.get(v.id) || {} })),
    };
}

// ---------------------------------------------------------------------------
// Ghi dữ liệu (admin) — toàn bộ chạy trong transaction để đảm bảo tính toàn vẹn
// giữa products / product_images / variants / variant_attributes.
// ---------------------------------------------------------------------------

async function create({ categoryId, name, slug, description, thumbnailUrl, status, images, variants }) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        const [productResult] = await connection.execute(
            `INSERT INTO products (category_id, name, slug, description, thumbnail_url, status)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [categoryId, name, slug, description || null, thumbnailUrl || null, status]
        );
        const productId = productResult.insertId;

        for (let i = 0; i < images.length; i += 1) {
            await connection.execute(
                'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
                [productId, images[i], i]
            );
        }

        for (const variant of variants) {
            const [variantResult] = await connection.execute(
                `INSERT INTO variants (product_id, sku_code, name, price, compare_at_price, image_url)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [productId, variant.skuCode, variant.name || null, variant.price, variant.compareAtPrice ?? null, variant.imageUrl || null]
            );
            const variantId = variantResult.insertId;

            for (const [attrName, attrValue] of Object.entries(variant.attributes || {})) {
                await connection.execute(
                    'INSERT INTO variant_attributes (variant_id, attribute_name, attribute_value) VALUES (?, ?, ?)',
                    [variantId, attrName, attrValue]
                );
            }
        }

        await connection.commit();
        return productId;
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

// Cập nhật theo kiểu "upsert by id": biến thể có id khớp với hàng đang tồn tại thì UPDATE
// tại chỗ — kể cả khi đổi sku_code — để giữ nguyên variant.id (warehouse-service và các
// service khác tham chiếu tồn kho/đơn hàng theo sku_id này, đổi id sẽ làm "mồ côi" tồn kho
// cũ và khởi tạo lại từ 0). Biến thể không có id (hoặc id không khớp hàng nào) là biến thể
// mới → INSERT; hàng cũ không còn xuất hiện trong payload (theo id) → DELETE.
async function update(id, { categoryId, name, slug, description, thumbnailUrl, status, images, variants }) {
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        await connection.execute(
            `UPDATE products
             SET category_id = ?, name = ?, slug = ?, description = ?, thumbnail_url = ?, status = ?
             WHERE id = ?`,
            [categoryId, name, slug, description || null, thumbnailUrl || null, status, id]
        );

        await connection.execute('DELETE FROM product_images WHERE product_id = ?', [id]);
        for (let i = 0; i < images.length; i += 1) {
            await connection.execute(
                'INSERT INTO product_images (product_id, image_url, sort_order) VALUES (?, ?, ?)',
                [id, images[i], i]
            );
        }

        const [existingVariants] = await connection.execute(
            'SELECT id FROM variants WHERE product_id = ?',
            [id]
        );
        const existingIds = new Set(existingVariants.map((v) => v.id));
        const incomingIds = new Set(variants.filter((v) => v.id && existingIds.has(v.id)).map((v) => v.id));

        for (const existing of existingVariants) {
            if (!incomingIds.has(existing.id)) {
                await connection.execute('DELETE FROM variants WHERE id = ?', [existing.id]);
            }
        }

        for (const variant of variants) {
            let variantId = variant.id && existingIds.has(variant.id) ? variant.id : null;

            if (variantId) {
                await connection.execute(
                    'UPDATE variants SET sku_code = ?, name = ?, price = ?, compare_at_price = ?, image_url = ? WHERE id = ?',
                    [variant.skuCode, variant.name || null, variant.price, variant.compareAtPrice ?? null, variant.imageUrl || null, variantId]
                );
                await connection.execute('DELETE FROM variant_attributes WHERE variant_id = ?', [variantId]);
            } else {
                const [result] = await connection.execute(
                    `INSERT INTO variants (product_id, sku_code, name, price, compare_at_price, image_url)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [id, variant.skuCode, variant.name || null, variant.price, variant.compareAtPrice ?? null, variant.imageUrl || null]
                );
                variantId = result.insertId;
            }

            for (const [attrName, attrValue] of Object.entries(variant.attributes || {})) {
                await connection.execute(
                    'INSERT INTO variant_attributes (variant_id, attribute_name, attribute_value) VALUES (?, ?, ?)',
                    [variantId, attrName, attrValue]
                );
            }
        }

        await connection.commit();
    } catch (err) {
        await connection.rollback();
        throw err;
    } finally {
        connection.release();
    }
}

async function remove(id) {
    const variants = await findVariantsByProductId(id);
    const skuIds = variants.map((v) => v.id);
    await db.execute('DELETE FROM products WHERE id = ?', [id]); // CASCADE xóa luôn images/variants/attributes
    return skuIds;
}

module.exports = {
    countListed,
    listForCatalog,
    countListedForAdmin,
    listForAdmin,
    findById,
    findVariantsByProductId,
    findDetailById,
    create,
    update,
    remove,
};
