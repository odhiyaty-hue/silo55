# Odhiyati Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from established e-commerce marketplaces (Airbnb for trust/browsing patterns, Etsy for product showcases) adapted for livestock marketplace and Arabic RTL context.

**Core Principle**: Build trust through clarity, professional presentation of livestock products, and seamless role-based experiences.

---

## Typography

**Arabic Font Stack**:
- Primary: 'Cairo' or 'Tajawal' from Google Fonts (excellent Arabic readability)
- Weights: Regular (400), Medium (500), SemiBold (600), Bold (700)

**Hierarchy**:
- Hero Headlines: text-5xl md:text-6xl font-bold
- Section Titles: text-3xl md:text-4xl font-semibold
- Card Titles: text-xl font-semibold
- Body Text: text-base font-normal
- Labels/Metadata: text-sm font-medium
- Captions: text-xs

---

## Layout System

**RTL Configuration**: Apply `dir="rtl"` to html element, use logical properties (start/end instead of left/right)

**Spacing Primitives**: Tailwind units of 2, 4, 6, and 8 (e.g., p-4, gap-6, mb-8, space-y-4)

**Container Strategy**:
- Max-width: max-w-7xl mx-auto
- Padding: px-4 md:px-6 lg:px-8
- Section spacing: py-12 md:py-16 lg:py-20

**Grid Patterns**:
- Product cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6
- Dashboard stats: grid-cols-2 md:grid-cols-4 gap-4
- Forms: Single column max-w-md for auth, two-column for detailed forms

---

## Component Library

### Navigation
**Main Header**:
- Fixed position with backdrop blur
- Logo (right side in RTL), centered navigation links, auth/profile (left side)
- Mobile: Hamburger menu transitioning from left
- Height: h-16 md:h-20

**Dashboard Sidebar**:
- Fixed right sidebar (RTL) with navigation items
- Width: w-64 on desktop, collapsible drawer on mobile
- Active state with border-r-4 accent indicator

### Product Cards (Sheep Listings)
**Structure**:
- Aspect ratio 4:3 image container with rounded-lg overflow-hidden
- Image with hover zoom effect (scale-105 transition)
- Card padding: p-4
- Price badge: Positioned top-left (RTL) with backdrop blur
- Status badge: Top-right for seller/admin views
- Grid of metadata icons (age, weight, location) with text-sm
- Primary CTA button at bottom

### Authentication Forms
**Layout**:
- Centered card: max-w-md with p-8
- Logo/brand at top
- Input fields with mb-4 spacing
- Role selection: Radio button group with custom card-style selectors
- Submit button: w-full with py-3

### Filters Panel
**Buyer Interface**:
- Sticky sidebar (desktop) or expandable drawer (mobile)
- Vertical stack of filter groups with space-y-6
- Range sliders for price, age, weight
- Checkbox list for cities
- "Apply Filters" button at bottom

### Admin Review Interface
**Pending Products View**:
- Two-column layout: Image gallery (left/right in RTL) + details panel
- Approve/Reject action buttons prominently placed
- Metadata table with clear labels
- Seller information card

### Dashboard Stats Cards
**Metrics Display**:
- Four-column grid on desktop (grid-cols-4)
- Icon + number + label pattern
- Padding: p-6
- Subtle border with rounded-lg

### Order Management
**Order Cards**:
- Timeline-style layout showing order progression
- Sheep thumbnail + buyer/seller info + status badge
- Action buttons contextual to role
- Expandable details section

---

## Images

**Hero Section**: 
- Full-width hero image showing pastoral sheep farming scene (authentic Middle Eastern/Arab context)
- Height: h-[500px] md:h-[600px]
- Overlay gradient for text readability
- CTAs with backdrop-blur-sm bg-white/10 treatment

**Product Images**:
- Square format prioritized for consistency
- Multiple images per listing (gallery with thumbnails)
- Placeholder: Sheep silhouette icon for missing images

**Trust Elements**:
- Seller profile avatars (circular, border-2)
- Admin verification badges
- Location/certification icons

**Image Locations**:
- Homepage hero: Welcoming farm/pastoral scene
- About section: Traditional sheep market imagery
- How it works: Illustrated steps or authentic photos of process
- Testimonials: User/seller photos if available
- Footer: Subtle pattern or minimal imagery

---

## Key Interactions

**No Complex Animations**: Minimal, purposeful motion only
- Card hover: subtle shadow elevation (shadow-md to shadow-xl)
- Button hover: slight opacity change
- Image hover: scale-105 zoom
- Page transitions: Simple fade

**Loading States**: Skeleton screens for product grids, spinner for actions

**Toast Notifications**: Fixed bottom-left (RTL), slide-in animation for order confirmations, approvals

---

## Arabic-Specific Considerations

- All text right-aligned by default
- Navigation flows right-to-left
- Form labels positioned right of inputs
- Icons mirror horizontally where directional (arrows, etc.)
- Number formatting uses Arabic-Indic numerals or Western Arabic based on preference (clarify with user)

---

## Page-Specific Layouts

**Landing Page**:
1. Hero with CTA (Register as Buyer/Seller)
2. How it works (3-column process)
3. Featured sheep (carousel or grid)
4. Trust indicators (admin oversight, verified sellers)
5. Testimonials (2-column)
6. Final CTA section

**Buyer Browse**:
- Left sidebar filters (desktop) / Top drawer (mobile)
- Main grid of sheep cards
- Pagination or infinite scroll

**Seller Dashboard**:
- Top stats row (total listings, pending, approved, sold)
- Action bar (Add New Sheep button)
- Table/grid of sheep listings with status badges

**Admin Panel**:
- Tabs: Pending Reviews, All Products, Users, Orders
- Review queue with approve/reject workflow
- User management table
- Order overview with filtering

---

**Accessibility**: High contrast for buttons and CTAs, clear focus states, semantic HTML structure, ARIA labels for Arabic screen readers

This design creates a trustworthy, professional marketplace experience optimized for Arabic users across all three roles.