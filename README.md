# Ahaarvritti - Food Donation Platform

Ahaarvritti is a comprehensive digital bridge between food donors and receivers, designed to make the donation process simple, transparent, and impactful. The platform connects restaurants, individuals, food banks, and NGOs to reduce food waste and fight hunger.

## 🌟 Features

### Core Features

- **User Authentication & Role Management**: Secure login/registration with role-based access (Restaurants, Food Banks, Individuals, Volunteers, Admins)
- **Donation Management**: Create, edit, and track food donations with detailed information
- **Request System**: Food banks can post requests and manage donation responses
- **Location-Based Matching**: Find nearby donors/receivers.
- **Real-time Notifications**: Stay updated with donation requests, acceptances, and status changes
- **Impact Analysis**: Track meals donated, waste prevented, and CO₂ emissions reduced
- **Rating & Feedback System**: Build trust through transparent ratings and reviews

### Advanced Features

- **Multilingual Support**: AI-powered chatbot in Hindi, English, and regional languages
- **Logistics Coordination**: Assign volunteers/drivers and track pickup/delivery status
- **Mobile Responsive**: Optimized for all devices and screen sizes


## 🏗️ Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Auth/           # Authentication components
│   ├── Layout/         # Layout and navigation
│   └── ...
├── contexts/           # React contexts for state management
│   ├── AuthContext.js  # Authentication state
│   ├── DonationContext.js # Donation management
│   └── NotificationContext.js # Notifications
├── pages/              # Page components
│   ├── Auth/           # Login/Register pages
│   ├── Dashboard/      # Dashboard pages
│   ├── Donation/       # Donation management
│   ├── Request/        # Request management
│   ├── Impact/         # Impact analysis page
│   └── ...
├── services/           # External service integrations
│   └── firebase.js     # Firebase configuration
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
└── styles/             # Global styles and CSS
```

## 👥 User Roles

### Restaurant

- Create and manage food donations
- View requests from food banks
- Track donation status and impact
- Manage pickup/delivery coordination

### Food Bank/NGO

- Post food requests
- Browse available donations
- Accept/reject donation offers
- Track received donations

### Individual

- Create personal donations
- Request food assistance
- Volunteer for logistics
- Track personal impact

### Volunteer

- Help with pickup/delivery
- Coordinate logistics
- Support food banks
- Earn recognition

## 🔧 Configuration

### Firebase Setup

1. **Authentication**: Enable Email/Password authentication
2. **Firestore Rules**: Configure security rules for data access
3. **Storage**: Set up storage rules for file uploads
4. **Cloud Functions**: Deploy functions for notifications (optional)

### Environment Variables

- `REACT_APP_FIREBASE_*`: Firebase configuration
- `REACT_APP_SENTRY_DSN`: Sentry error tracking (optional)

## 🛠️ Development

### Available Scripts

- `npm start` - Start development server
- `npm build` - Build for production
- `npm test` - Run tests
- `npm eject` - Eject from Create React App

### Code Style

- Use functional components with hooks
- Follow React best practices
- Use TypeScript for type safety (optional)
- Implement proper error handling
- Write unit tests for critical functions

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Firebase Hosting

1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Deploy: `firebase deploy`

### Deploy to Other Platforms

- **Vercel**: Connect GitHub repository
- **Netlify**: Drag and drop build folder
- **AWS S3**: Upload build files to S3 bucket

## 🔒 Security

- Firebase Authentication for user management
- Firestore security rules for data protection
- Input validation and sanitization
- HTTPS enforcement in production
- Regular security audits

## 📊 Monitoring & Reporting

- Firebase Analytics integration
- Error tracking with Sentry (optional)
- Performance monitoring
- Impact measurement

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request



## 🙏 Acknowledgments

- Firebase for backend services
- React community for excellent tools
- Open source contributors
- Food banks and NGOs for inspiration



**Ahaarvritti** - Connecting food donors with those in need to reduce waste and fight hunger. 🌱
