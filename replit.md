# أضحيتي (Odhiyati) - منصة بيع الأغنام

## Overview
أضحيتي (Odhiyati) is a comprehensive Arabic web platform designed for buying and selling sheep, primarily targeting the Algerian market. It features a complete administrative supervision system and supports three user roles: buyers, sellers, and administrators. The platform aims to streamline the process of livestock exchange with a focus on ease of use, secure transactions, and robust management. It includes a VIP membership system to offer enhanced benefits to both buyers and sellers, an integrated orders management system, and comprehensive payment processing.

## User Preferences
- اللغة الأساسية: العربية
- الاتجاه: RTL (من اليمين لليسار)
- التصميم: عصري، نظيف، احترافي
- الخطوط: Cairo و Tajawal
- الألوان: نظام الوان احترافي مع دعم الوضع الليلي
- السوق: الجزائر
- العملة: دينار جزائري (DA)
- الولايات: 58 ولاية جزائرية

## System Architecture

### UI/UX Decisions
The platform features a modern, clean, and professional design with full RTL (right-to-left) support, Arabic as the primary language, and a professional color scheme including dark/light mode. The chosen fonts are Cairo and Tajawal. The platform is localized for Algeria, using Algerian Dinar (DA) and listing 58 Algerian states, along with all 1,541 municipalities.

### Technical Implementations
- **Frontend**: React, TypeScript, Tailwind CSS, Shadcn UI for a modern and responsive user interface. Wouter is used for routing, TanStack React Query for state management, and React Hook Form with Zod for form handling and validation.
- **Backend**: Express.js integrated with Firebase Admin SDK.
- **Database**: Firebase Firestore is used for data storage, organizing data into `users`, `sheep` (listings with approval status), `orders` (purchase requests), `payments`, `cibReceipts`, `installments`, and `vipSubscriptions`.
- **Authentication**: Firebase Auth supports Email/Password and Google sign-in. Client-side authentication manages user sessions and protects routes.
- **Image Hosting**: ImgBB API is used for automatic image uploads.
- **Email Service**: Nodemailer integration with SMTP for various notifications (verification, password reset, order confirmations).

### Feature Specifications
- **User Roles**: Buyer, Seller, and Admin, with distinct permissions and dashboards.
- **Authentication**: Email/password and Google sign-in with role selection, guest browsing mode.
- **Listings Management**: Sellers can add, edit, and delete sheep listings with image uploads. Advanced browsing with real-time filters (price, age, weight, city/wilaya/municipality).
- **Order System**: Buyers create purchase orders; Admin reviews; Seller receives. Comprehensive order tracking for users.
- **Admin Dashboard**: Product approval workflow, user management, payment verification, and platform oversight.
- **VIP System**: Three-tier VIP packages (Silver, Gold, Platinum) offering discounts, priority support, enhanced visibility for sellers, and exclusive access for buyers.
- **Payment System**: Supports CIB Bank Transfer (with receipt upload), Cash on Delivery, and Installments for sheep purchases.
- **Localization**: Full Arabic RTL interface, dark/light mode support, and comprehensive Algerian geographical data (58 wilayas, 1,541 municipalities).

### System Design Choices
The project uses a monorepo structure with `client/` for the React frontend, `server/` for the Express backend, and `shared/` for common schemas and types. Development uses Vite middleware with Express, while production leverages Vercel's serverless functions for API endpoints. Firebase Admin SDK on the backend ensures secure server-side data access. Firestore security rules enforce role-based access control and data ownership.

## Replit Setup Status
- ✅ **Workflow Configured**: `npm run dev` on port 5000
- ✅ **Vite Dev Server**: Configured with `allowedHosts: true` for Replit proxy
- ✅ **Package Installation**: nanoid and all dependencies installed
- ✅ **Firebase Admin**: Initialized with service account credentials
- ✅ **Guest Login**: Fixed to use local storage (no anonymous auth needed)
- ⚠️ **Client-side Firebase**: Requires environment variables:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_APP_ID`
- ✅ **Port Configuration**: Server running on 0.0.0.0:5000 (frontend + API)
- ✅ **Deployment Config**: Configured for autoscale deployment

## External Dependencies
-   **Firebase**:
    -   **Firebase Firestore**: Database for all application data.
    -   **Firebase Authentication**: User authentication and authorization.
    -   **Firebase Admin SDK**: Server-side access to Firebase services.
-   **ImgBB API**: External service for hosting images uploaded by users.
-   **Nodemailer**: For sending transactional emails (verification, password reset, order notifications).
-   **Vercel**: Deployment platform for the application, utilizing serverless functions for the API.
-   **Municipalities Data**: Static JSON file containing all Algerian commune data.