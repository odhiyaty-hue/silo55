# دليل نشر المشروع على Vercel

## نظرة عامة
تم إعداد المشروع ليعمل على Vercel كتطبيق ثابت (Static Site) بالكامل.
المشروع يستخدم Firebase للمصادقة وقاعدة البيانات والتخزين (client-side فقط).

⚠️ **ملاحظة مهمة**: المشروع حالياً لا يحتوي على API routes في الباك اند (server/routes.ts فارغ).
جميع العمليات تتم من الفرونت اند مباشرة مع Firebase.

## البنية المعدة لـ Vercel

### 1. الملفات الأساسية
- `vercel.json` - ملف التكوين الرئيسي لـ Vercel
  - `buildCommand`: أمر البناء (npm run vercel-build)
  - `outputDirectory`: مجلد المخرجات (dist/public)
  - `routes`: قواعد التوجيه مع filesystem handling للأصول الثابتة
- `dist/public/` - المجلد الذي يحتوي على ملفات الواجهة المبنية

### 2. Scripts في package.json
```json
"vercel-build": "vite build"     // Script يستخدمه Vercel تلقائياً
"build:client": "vite build"     // لبناء الواجهة فقط
```

### 3. التحقق من البناء المحلي
قبل النشر على Vercel، تأكد من أن البناء يعمل محلياً:
```bash
npm run vercel-build
ls dist/public/
```
يجب أن ترى:
- `index.html`
- `assets/` (مجلد يحتوي على JS، CSS، والصور)
- `favicon.png`
- `logo.png`

## خطوات النشر على Vercel

### الطريقة الأولى: عبر Vercel Dashboard

1. **إنشاء حساب على Vercel**
   - اذهب إلى https://vercel.com
   - سجل دخول باستخدام GitHub أو أي طريقة أخرى

2. **استيراد المشروع**
   - اضغط على "Add New Project"
   - اختر المستودع (Repository) من GitHub/GitLab/Bitbucket
   - أو ارفع الملفات يدوياً

3. **إعدادات المشروع**
   ```
   Framework Preset: Vite
   Build Command: npm run vercel-build (أو تركه فارغاً)
   Output Directory: dist/public
   Install Command: npm install
   ```

4. **إضافة متغيرات البيئة**
   اذهب إلى Project Settings → Environment Variables وأضف:
   ```
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_APP_ID=your_app_id
   ```

5. **النشر**
   - اضغط Deploy
   - انتظر حتى يكتمل البناء (Build)
   - احصل على رابط الموقع

### الطريقة الثانية: عبر Vercel CLI

1. **تثبيت Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **تسجيل الدخول**
   ```bash
   vercel login
   ```

3. **النشر**
   ```bash
   vercel
   ```
   - اتبع التعليمات التفاعلية
   - أضف متغيرات البيئة عند الطلب

4. **النشر للإنتاج**
   ```bash
   vercel --prod
   ```

## التحقق من النشر

بعد النشر الناجح:
1. ✅ الواجهة يجب أن تظهر بشكل صحيح (HTML/CSS/JS)
2. ✅ لا يجب أن يظهر الكود البرمجي في المتصفح
3. ✅ الصور والأصول الثابتة تعمل
4. ✅ التوجيه (Routing) يعمل بشكل صحيح

## حل المشاكل الشائعة

### المشكلة: يظهر الكود البرمجي بدلاً من الموقع
**الحل:**
- تأكد من أن `vercel.json` موجود في المجلد الرئيسي
- تأكد من أن Output Directory هو `dist/public`
- تأكد من تشغيل `npm run vercel-build` محلياً ينشئ `dist/public`

### المشكلة: 404 على المسارات الفرعية
**الحل:**
- تم حل هذا في `vercel.json` عبر rewrite rules
- جميع المسارات غير الموجودة تُعاد إلى `/index.html`

### المشكلة: متغيرات البيئة لا تعمل
**الحل:**
- تأكد من أن جميع المتغيرات تبدأ بـ `VITE_`
- أضف المتغيرات في Vercel Dashboard تحت Environment Variables
- أعد بناء المشروع بعد إضافة المتغيرات

## ملاحظات مهمة

### 1. الاختلاف بين Replit و Vercel
- **Replit**: يدعم Express server كامل مع WebSockets
- **Vercel**: فقط Static sites + Serverless functions

### 2. Firebase Authentication
- Firebase Auth يعمل بشكل كامل لأنه client-side
- لا حاجة لإعدادات خاصة

### 3. إضافة API Routes مستقبلاً
إذا احتجت في المستقبل لإضافة API routes:
- أنشئ مجلد `api/` في الجذر
- أضف ملفات JavaScript/TypeScript كـ serverless functions
- كل ملف في `api/` يصبح endpoint (مثال: `api/hello.js` → `/api/hello`)
- راجع [Vercel Serverless Functions Documentation](https://vercel.com/docs/functions/serverless-functions)

## البديل: النشر على Replit

إذا واجهت مشاكل مع Vercel أو كنت بحاجة لميزات أكثر:

1. المشروع جاهز للعمل على Replit
2. اضغط Deploy في Replit
3. اختر Autoscale deployment
4. سيعمل كل شيء بشكل تلقائي

## الدعم

للمزيد من المعلومات:
- [Vercel Documentation](https://vercel.com/docs)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html)
- [Firebase Web Setup](https://firebase.google.com/docs/web/setup)
