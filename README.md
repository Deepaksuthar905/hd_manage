# HD Manage - api Dashboard

api dashboard for managing hardware and plywood shop e-commerce platform.

## Features

- 📊 **Dashboard**: View statistics including total users, today's orders, today's collection, and total products
- 👥 **User Management**: View, edit, and delete users
- 📦 **Product Management**: Add, edit, delete products with image upload functionality
- 🛒 **Order Management**: View and manage orders, update order status
- ⚙️ **Settings**: Configure shop settings

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure your API endpoint:
   - Open `lib/api.ts`
   - Update `API_BASE_URL` with your actual backend API URL
   - Example: `const API_BASE_URL = 'http://localhost:3001/api';`

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000/api/login](http://localhost:3000/api/login) in your browser

## API Endpoints Configuration

The api panel expects the following API endpoints. Update them in `lib/api.ts` according to your backend structure:

### Authentication
- `POST /api/login` - api login

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/orders/today` - Get today's orders
- `GET /api/collection/today` - Get today's collection

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/image` - Upload product images

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `PUT /api/orders/:id/status` - Update order status

## Project Structure

```
hd_manage/
├── app/
│   ├── api/
│   │   ├── page.tsx          # Dashboard
│   │   ├── users/
│   │   │   └── page.tsx      # Users management
│   │   ├── products/
│   │   │   └── page.tsx      # Products management
│   │   ├── orders/
│   │   │   └── page.tsx      # Orders management
│   │   ├── settings/
│   │   │   └── page.tsx      # Settings
│   │   ├── login/
│   │   │   └── page.tsx      # Login page
│   │   └── layout.tsx        # api layout
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── components/
│   ├── Sidebar.tsx           # Navigation sidebar
│   └── apiLayout.tsx       # api layout wrapper
├── lib/
│   └── api.ts               # API configuration and endpoints
└── package.json
```

## Customization

### Update API Endpoints

Edit `lib/api.ts` to match your backend API structure. The file contains all API endpoint definitions.

### Styling

The project uses Tailwind CSS. Customize colors and styles in:
- `tailwind.config.js` - Tailwind configuration
- `app/globals.css` - Global styles

### Authentication

The api panel uses token-based authentication. Tokens are stored in localStorage. Update the authentication logic in:
- `app/api/login/page.tsx` - Login page
- `lib/api.ts` - API interceptors for token handling

## Build for Production

```bash
npm run build
npm start
```

## Notes

- Make sure your backend API supports CORS if running on different ports
- Update image upload handling based on your backend's file upload implementation
- The demo mode allows login with any credentials for testing purposes

## Support

For issues or questions, please check your API endpoints match the expected structure in `lib/api.ts`.
