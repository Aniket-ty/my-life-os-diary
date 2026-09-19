# My Life OS — Expense, Splitwise, Currency, OCR & Voice API Documentation

All endpoints are mounted under `/api/v1` and require Bearer JWT authentication unless noted.

Header format:
`Authorization: Bearer <accessToken>`

---

## 1. Expense Engine Endpoints (`/api/v1/expenses`)

### `GET /api/v1/expenses/summary`
Get dashboard statistics for the authenticated user.
* **Authentication**: Required
* **Response**:
  ```json
  {
    "currency": "INR",
    "today": {
      "total": 930.00,
      "categories": { "Food": 250, "Transport": 180, "Shopping": 500 }
    },
    "thisWeek": { "total": 4200.00 },
    "thisMonth": {
      "total": 18450.00,
      "categories": [
        { "category": "Food", "amount": 6200.00, "percentage": 34 },
        { "category": "Rent", "amount": 10000.00, "percentage": 54 }
      ]
    },
    "dailyTrend": [
      { "date": "2026-09-13", "total": 450.00 },
      { "date": "2026-09-14", "total": 930.00 }
    ],
    "recentExpenses": [ ... ],
    "largestExpenses": [ ... ]
  }
  ```

### `GET /api/v1/expenses`
List expenses with filters, search, and pagination.
* **Query Parameters**:
  * `startDate` (ISO Date string)
  * `endDate` (ISO Date string)
  * `category` (Food, Transport, Shopping, Bills, etc.)
  * `source` (MANUAL, VOICE, OCR, IMPORT)
  * `groupId` (Filter by specific Splitwise group)
  * `search` (Search in title, description, or notes)
  * `page` (Default: 1)
  * `limit` (Default: 30)
  * `sortBy` (`expenseDate`, `amount`, `createdAt`)
  * `sortOrder` (`asc`, `desc`)
* **Response**:
  ```json
  {
    "expenses": [ ... ],
    "pagination": { "total": 42, "page": 1, "limit": 30, "totalPages": 2 }
  }
  ```

### `POST /api/v1/expenses`
Create personal or group expense with splits and multi-currency conversion.
* **Request Body**:
  ```json
  {
    "title": "Dinner at Olive",
    "amount": 2400.00,
    "currency": "INR",
    "category": "Food",
    "expenseDate": "2026-09-19",
    "paymentMethod": "UPI",
    "groupId": "uuid-optional",
    "splitType": "EQUAL",
    "splits": [
      { "userId": "user-1" },
      { "userId": "user-2" }
    ],
    "notes": "Shared pizza and drinks"
  }
  ```
* **Response**: `201 Created`

### `PUT /api/v1/expenses/:id`
Update an expense and recompute split amounts.
* **Response**: `200 OK`

### `DELETE /api/v1/expenses/:id`
Delete an expense and associated splits.
* **Response**: `204 No Content`

---

## 2. Splitwise Group Endpoints (`/api/v1/groups`)

### `GET /api/v1/groups`
List all groups the authenticated user belongs to, including live calculated net balance.
* **Response**:
  ```json
  [
    {
      "id": "group-uuid",
      "name": "Goa Trip",
      "description": "Weekend getaway",
      "defaultCurrency": "INR",
      "memberCount": 4,
      "userNetBalance": 800.00,
      "totalPaid": 12000.00
    }
  ]
  ```

### `POST /api/v1/groups`
Create a new group and add creator as admin.
* **Request Body**:
  ```json
  {
    "name": "Goa Trip",
    "description": "Weekend with college friends",
    "defaultCurrency": "INR",
    "memberEmails": ["rahul@example.com", "aman@example.com"]
  }
  ```
* **Response**: `201 Created`

### `GET /api/v1/groups/:id`
Get full group dashboard: members, debts, net balances, and greedy simplified settlements.
* **Response**:
  ```json
  {
    "id": "group-uuid",
    "name": "Goa Trip",
    "members": [ ... ],
    "expenses": [ ... ],
    "balances": [
      { "userId": "u1", "name": "Aniket", "paid": 2400, "owed": 800, "net": 1600 },
      { "userId": "u2", "name": "Rahul", "paid": 0, "owed": 800, "net": -800 },
      { "userId": "u3", "name": "Aman", "paid": 0, "owed": 800, "net": -800 }
    ],
    "suggestedSettlements": [
      { "fromUserId": "u2", "fromName": "Rahul", "toUserId": "u1", "toName": "Aniket", "amount": 800.00 },
      { "fromUserId": "u3", "fromName": "Aman", "toUserId": "u1", "toName": "Aniket", "amount": 800.00 }
    ],
    "totalSpent": 2400.00
  }
  ```

### `POST /api/v1/groups/:id/members`
Add member to group by email or userId.

### `DELETE /api/v1/groups/:id/members/:memberId`
Remove member from group (Blocked if net balance is not 0).

### `POST /api/v1/groups/:id/leave`
Leave group (Blocked if user has an unsettled balance).

---

## 3. Settlements Endpoints (`/api/v1/settlements`)

### `POST /api/v1/settlements`
Record a peer-to-peer settlement payment.
* **Request Body**:
  ```json
  {
    "groupId": "group-uuid",
    "fromUserId": "user-rahul-id",
    "toUserId": "user-aniket-id",
    "amount": 400.00,
    "currency": "INR",
    "note": "Paid via GPay"
  }
  ```
* **Response**: `201 Created`

### `GET /api/v1/settlements/group/:groupId`
List past settlements recorded in a group.

### `DELETE /api/v1/settlements/:id`
Cancel / delete a settlement and recalculate balances automatically.

---

## 4. Multi-Currency Endpoints (`/api/v1/currencies`)

### `GET /api/v1/currencies`
List supported currencies with symbols and metadata.

### `GET /api/v1/currencies/rate?from=EUR&to=INR`
Fetch live or cached exchange rate.
* **Response**:
  ```json
  {
    "rate": "94.50000000",
    "source": "api",
    "fetchedAt": "2026-09-19T10:00:00Z",
    "fresh": true
  }
  ```

### `POST /api/v1/currencies/convert`
Convert amount between currencies.
* **Request Body**: `{ "amount": 100, "from": "EUR", "to": "INR" }`
* **Response**:
  ```json
  {
    "amount": 100,
    "originalAmount": 100,
    "currency": "EUR",
    "baseAmount": 9450.00,
    "baseCurrency": "INR",
    "exchangeRate": "94.50000000",
    "rateSource": "api"
  }
  ```

---

## 5. Receipt & OCR Endpoints (`/api/v1/receipts`)

### `POST /api/v1/receipts/scan`
Upload a receipt photo for OCR extraction.
* **Content-Type**: `multipart/form-data`
* **Field**: `receipt` (image file: JPG, PNG, WebP)
* **Response**:
  ```json
  {
    "receipt": {
      "id": "receipt-uuid",
      "merchant": "Dominos Pizza",
      "receiptDate": "2026-09-19",
      "currency": "INR",
      "subtotal": 800.00,
      "tax": 144.00,
      "tip": 0.00,
      "total": 944.00,
      "items": [
        { "name": "Pizza", "quantity": 1, "amount": 600.00 },
        { "name": "Garlic Bread", "quantity": 1, "amount": 200.00 }
      ],
      "processingStatus": "extracted"
    },
    "possibleDuplicate": false
  }
  ```

### `POST /api/v1/receipts/preview-splits`
Calculate individual shares for item-level bill splitting with proportional or equal tax.
* **Request Body**:
  ```json
  {
    "items": [
      { "name": "Pizza", "amount": 800, "assignedUserIds": ["u1", "u2"] },
      { "name": "Burger", "amount": 500, "assignedUserIds": ["u3"] }
    ],
    "subtotal": 1300,
    "tax": 130,
    "tip": 0,
    "total": 1430,
    "taxAllocation": "proportional"
  }
  ```

### `POST /api/v1/receipts/:id/create-expense`
Confirm receipt and convert into personal or group expense with item-level splits.

---

## 6. Voice Assistant Endpoints (`/api/v1/voice`)

### `POST /api/v1/voice/command`
Submit transcribed natural language command.
* **Request Body**: `{ "transcript": "I spent 500 rupees on lunch" }`
* **Response**:
  ```json
  {
    "intent": "CREATE_EXPENSE",
    "confidence": 0.97,
    "provider": "python-fastapi",
    "kind": "action",
    "executed": true,
    "executionMessage": "Added ₹500.00 Food expense."
  }
  ```

### `POST /api/v1/voice/confirm`
Confirm execution for actions requiring safety confirmation (e.g. large expenses, deletions).
* **Request Body**: `{ "serverCommandId": "uuid", "confirmed": true }`

### `POST /api/v1/voice/listen`
Combined audio recording transcription + command execution.
* **Content-Type**: `multipart/form-data`
* **Field**: `audio` (audio file: webm, m4a, wav)
