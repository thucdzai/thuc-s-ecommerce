import { apiClient, unwrap } from './client';

export const uploadsApi = {
  // files: File[] — gửi multipart/form-data, BE (product-service) trả về { urls: string[] }
  // là các đường dẫn tương đối '/api/uploads/files/<file>' để gán thẳng vào thumbnailUrl/images/imageUrl.
  images: (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return apiClient
      .post('/uploads/images', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(unwrap);
  },
};
