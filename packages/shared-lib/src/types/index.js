/**
 * Type definitions and enums shared across the microservices.
 */
function createSuccessResponse(data,meta = {}){
    return {
        success:true,
        data,
        meta,
        errors:null,
    }
}

function createErrorResponse(message, statusCode, errors = []) {
  return {
    success: false,
    data: null,
    meta: {},
    errors: [{ message, statusCode, details: errors }],
  };
}

function createPaginationMeta(page,limit,total){
    return {
        page,
        limit,
        total,
        totalPages : Math.ceil(total/limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
    }
}

module.exports = {
    createSuccessResponse,
    createErrorResponse,
    createPaginationMeta,
}
