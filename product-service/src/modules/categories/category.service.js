const categoryRepository = require('./category.repository');

function toNode(row) {
    return { id: row.id, name: row.name, slug: row.slug, children: [] };
}

// BE dựng sẵn cây danh mục đa cấp từ danh sách phẳng — FE chỉ việc render, không phải tự nhóm theo parent_id.
function buildTree(rows) {
    const nodesById = new Map(rows.map((row) => [row.id, toNode(row)]));
    const roots = [];

    for (const row of rows) {
        const node = nodesById.get(row.id);
        if (row.parent_id && nodesById.has(row.parent_id)) {
            nodesById.get(row.parent_id).children.push(node);
        } else {
            roots.push(node);
        }
    }

    return roots;
}

async function getCategoryTree() {
    const rows = await categoryRepository.listAll();
    return buildTree(rows);
}

module.exports = { getCategoryTree };
