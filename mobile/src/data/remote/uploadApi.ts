import { AxiosInstance } from 'axios';
import { ApiSuccessResponse } from '../../core/common/types';

export class UploadApi {
  constructor(private readonly client: AxiosInstance) {}

  /**
   * Upload an image file to Cloudinary via the API.
   * Only the returned URL should be persisted on provider/service records.
   */
  async uploadImage(uri: string, fileName = 'photo.jpg'): Promise<string> {
    const form = new FormData();
    const name = fileName.includes('.') ? fileName : `${fileName}.jpg`;
    form.append('file', {
      uri,
      name,
      type: 'image/jpeg',
    } as unknown as Blob);

    const response = await this.client.post<
      ApiSuccessResponse<{ url: string; publicId?: string }>
    >('/uploads/image', form, {
      timeout: 60_000,
      transformRequest: (data, headers) => {
        if (headers && typeof headers === 'object') {
          delete (headers as Record<string, unknown>)['Content-Type'];
        }
        return data;
      },
    });

    const url = response.data.data?.url;
    if (!url) {
      throw new Error('تعذر رفع الصورة');
    }
    return url;
  }
}
