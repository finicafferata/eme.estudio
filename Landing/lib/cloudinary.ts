import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export interface CloudinaryUploadResult {
  public_id: string
  url: string
  secure_url: string
  width: number
  height: number
  format: string
}

export async function uploadToCloudinary(
  file: File,
  folder: string = 'eme-estudio'
): Promise<CloudinaryUploadResult> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 2000, crop: 'limit', quality: 'auto:good' }
          ]
        },
        (error, result) => {
          if (error || !result) {
            reject(error || new Error('Upload failed'))
          } else {
            resolve(result as CloudinaryUploadResult)
          }
        }
      )
      .end(buffer)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId)
}

export function getCloudinaryUrl(publicId: string, transformation?: string): string {
  if (!publicId) return ''

  const baseUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`

  if (transformation) {
    return `${baseUrl}/${transformation}/${publicId}`
  }

  return `${baseUrl}/${publicId}`
}

export function getThumbnailUrl(publicId: string): string {
  return getCloudinaryUrl(publicId, 'w_400,h_400,c_fill,q_80')
}

export function getDisplayUrl(publicId: string): string {
  return getCloudinaryUrl(publicId, 'w_1200,q_85')
}

export function getLightboxUrl(publicId: string): string {
  return getCloudinaryUrl(publicId, 'w_2000,q_90')
}

export { cloudinary }
