# 🎮 GamerSpotlight – Cloud-Based Esports Platform

GamerSpotlight is a full-stack esports web application designed to unify community interaction, video content browsing, and a dynamic marketplace powered by user-driven bidding and order creation. Built entirely using AWS serverless architecture, it offers scalable performance with low operational overhead.

---

## 🌐 Features

- ✅ **User Authentication** – Secure login via Amazon Cognito Hosted UI  
- 📝 **Community Module** – Create, edit, pin, and view posts with images  
- 🛒 **Marketplace** – Upload products, enable bidding, stop bidding, and generate orders  
- 🔍 **Personalization** – Pin filtering and user-specific views  
- ☁️ **Fully Serverless** – Built using AWS Lambda, API Gateway, DynamoDB, S3

---

## 🧱 Architecture Overview

```plaintext
Frontend (HTML/CSS/JS) ➝ API Gateway ➝ AWS Lambda ➝ DynamoDB / S3
                                     ⬑ Cognito for Auth
```

- **Frontend**: HTML, Bootstrap, JavaScript  
- **Backend**: AWS Lambda (Node.js)  
- **Database**: DynamoDB  
- **Storage**: Amazon S3  
- **Authentication**: Cognito Hosted UI  
- **API Management**: Amazon API Gateway

---

## 🚀 Getting Started (For Developers)

1. **Frontend Setup**  
   Upload all `*.html` files to an S3 bucket configured for static website hosting.

2. **Authentication Setup**  
   - Create a Cognito User Pool and Hosted UI  
   - Update your `signin.html` redirect URI  
   - Add `aws-exports.js` or use OIDC (if using `oidc-client-ts`)

3. **API Gateway + Lambda**  
   - Deploy API Gateway endpoints (REST or HTTP)  
   - Use Node.js (Lambda runtime) to implement handlers  
   - Connect each API to DynamoDB (Posts, Bids, Orders) and S3 (Images)

---

## 🧪 Key Lambda Functions

| Function           | Description                              |
|--------------------|------------------------------------------|
| `handlePostUpload` | Create new post with optional image      |
| `handleGetPosts`   | Fetch posts for community display        |
| `handlePlaceBid`   | Place a bid and update currentBid        |
| `handleStopBid`    | Finalize bidding, create order           |
| `handleGetOrders`  | Fetch orders for logged-in user          |
| `handlePinPost`    | Add/remove pinned post for a user        |

---

## 📸 Screenshots

- Community Page with Post + Pin  
- Product Upload Form  
- Bidding Flow + Order View  
*(See `/screenshots` folder if included)*

---

## 📚 Project Status

✅ FYP2 Completed  
✅ Submitted to UTAR  
✅ Demo-ready & Live-tested  
🔧 Future work: Payment integration, admin tools, real-time updates

---

## 📜 License

This project is for academic purposes (UTAR Final Year Project). Not intended for production use.

---

## 🙋 Author

**Lim Boon Chong**  
Bachelor of Information Systems (Hons)  
Universiti Tunku Abdul Rahman  
Project: GamerSpotlight (May 2025)
