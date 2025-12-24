/**
 * ImgBB Image Upload Service
 * يرفع الصور تلقائياً إلى ImgBB ويعيد الرابط
 */

interface ImgBBResponse {
  data: {
    id: string;
    title: string;
    url_viewer: string;
    url: string;
    display_url: string;
    width: number;
    height: number;
    size: number;
    time: number;
    expiration: number;
    image: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    thumb: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    medium: {
      filename: string;
      name: string;
      mime: string;
      extension: string;
      url: string;
    };
    delete_url: string;
  };
  success: boolean;
  status: number;
}

interface ImgBBErrorResponse {
  success: boolean;
  error?: {
    code: number;
    message: string;
  };
}

/**
 * رفع صورة واحدة إلى ImgBB
 * @param file - ملف الصورة
 * @returns رابط الصورة من ImgBB
 */
export const uploadToImgBB = async (file: File): Promise<string> => {
  try {
    const apiKey = import.meta.env.VITE_IMGBB_API_KEY;
    
    if (!apiKey) {
      throw new Error("❌ VITE_IMGBB_API_KEY غير موجود في متغيرات البيئة");
    }

    // تحقق من أن حجم الملف معقول (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("حجم الملف يجب أن يكون أقل من 5MB");
    }

    const formData = new FormData();
    formData.append("image", file);
    formData.append("expiration", "31536000"); // سنة واحدة

    const url = `https://api.imgbb.com/1/upload?key=${apiKey}`;
    
    console.log("📤 يتم رفع الملف إلى ImgBB...");
    
    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    const responseData: ImgBBResponse | ImgBBErrorResponse = await response.json();

    if (!response.ok || !('data' in responseData) || !responseData.success) {
      const errorMsg = 'error' in responseData ? responseData.error?.message : `HTTP ${response.status}`;
      throw new Error(`❌ ImgBB Error: ${errorMsg}`);
    }

    if (!('data' in responseData)) {
      throw new Error("❌ استجابة ImgBB غير صحيحة");
    }

    console.log("✅ تم رفع الملف بنجاح:", responseData.data.url);
    return responseData.data.url;
  } catch (error) {
    console.error("❌ خطأ في رفع الصورة إلى ImgBB:", error);
    throw error;
  }
};

/**
 * رفع صورة واحدة إلى ImgBB (نفس الدالة بأسماء مختلفة للتوافقية)
 * @param file - ملف الصورة
 * @returns رابط الصورة من ImgBB
 */
export const uploadImageToImgBB = async (file: File): Promise<string> => {
  return uploadToImgBB(file);
};

/**
 * رفع عدة صور إلى ImgBB بالتوازي
 * @param files - قائمة ملفات الصور
 * @returns قائمة روابط الصور
 */
export const uploadMultipleImagesToImgBB = async (files: File[]): Promise<string[]> => {
  try {
    const uploadPromises = files.map(file => uploadToImgBB(file));
    const imageUrls = await Promise.all(uploadPromises);
    return imageUrls;
  } catch (error) {
    console.error("خطأ في رفع الصور متعددة إلى ImgBB:", error);
    throw error;
  }
};
