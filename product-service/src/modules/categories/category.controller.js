const asyncHandler = require('../../utils/asyncHandler');
const { ok } = require('../../utils/apiResponse');
const categoryService = require('./category.service');

const getTree = asyncHandler(async (req, res) => {
    const tree = await categoryService.getCategoryTree();
    return ok(res, tree, 'Lấy danh mục thành công');
});

module.exports = { getTree };
