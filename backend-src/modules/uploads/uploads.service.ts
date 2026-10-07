import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

function cloudinaryErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  return 'Cloudinary upload failed';
}

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private configured = false;

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('cloudinary.cloudName');
    const apiKey = this.config.get<string>('cloudinary.apiKey');
    const apiSecret = this.config.get<string>('cloudinary.apiSecret');
    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
    }
  }

  async uploadImage(file: Express.Multer.File) {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET.',
      );
    }
    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('Only image files are allowed');
    }

    const folder =
      this.config.get<string>('cloudinary.folder') ?? 'hadjzi';

    let result: {
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
    };

    try {
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: 'image',
          },
          (err, uploaded) => {
            if (err || !uploaded?.secure_url) {
              reject(err ?? new Error('Upload failed'));
              return;
            }
            resolve({
              secure_url: uploaded.secure_url,
              public_id: uploaded.public_id,
              width: uploaded.width,
              height: uploaded.height,
            });
          },
        );
        stream.end(file.buffer);
      });
    } catch (err) {
      const msg = cloudinaryErrorMessage(err);
      this.logger.warn(`Cloudinary upload failed: ${msg}`);
      throw new BadRequestException(
        msg.includes('cloud_name') || msg.includes('Invalid')
          ? `Cloudinary rejected the upload: ${msg}. Check CLOUDINARY_CLOUD_NAME in .env (Dashboard → Account Details).`
          : `تعذر رفع الصورة: ${msg}`,
      );
    }

    return {
      url: result.secure_url,
      publicId: result.public_id,
      width: result.width,
      height: result.height,
    };
  }
}
