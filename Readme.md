# QuizMaster-Pro: Documentation
 
**Live Application:** https://quizmaster-frontend-phi.vercel.app/

---

## Table of Contents

### Part 1: Technical Documentation
- **1.1** System Architecture Overview
- **1.2** Backend Design (FastAPI)
  - 1.2.1 Project Structure
  - 1.2.2 Core Technologies & Design Rationale
  - 1.2.3 Authentication & Authorization Flow
  - 1.2.4 AI Quiz Generation Module
- **1.3** Frontend Design (Vanilla JS)
  - 1.3.1 Structure and Rationale
  - 1.3.2 State Management
- **1.4** Database Design (Neon DB - PostgreSQL)
  - 1.4.1 Table Schema Details
- **1.5** API Endpoint Documentation
- **1.6** Local Development Setup

### Part 2: Non-Technical User Manual
- **2.1** Introduction
- **2.2** For Students: The User Experience
  - 2.2.1 Registration and Login
  - 2.2.2 The User Dashboard
  - 2.2.3 Taking a Quiz
  - 2.2.4 Reviewing Your History & Performance
- **2.3** For Administrators: Managing the Platform
  - 2.3.1 The Admin Dashboard
  - 2.3.2 Content Management (Subjects, Chapters, Quizzes)
  - 2.3.3 How to Use AI Quiz Generation
  - 2.3.4 User Management

---

# Part 1: Technical Documentation

*This section details the internal architecture, design decisions, and implementation of QuizMaster Pro. It is intended for software developers who will maintain or contribute to the project.*

## 1.1 System Architecture Overview

QuizMaster Pro is built on a **decoupled, client-server architecture**. This design separates the user interface (frontend) from the business logic and data persistence (backend), allowing for independent development, scaling, and deployment.

### Architecture Components

**Frontend (Client)**  
A static web application built with Vanilla HTML, CSS, and JavaScript. It is responsible for rendering the user interface and interacting with the user. It communicates with the backend via asynchronous HTTP requests (fetch API) to a RESTful API. The frontend is deployed on Vercel.

**Backend (Server)**  
A high-performance REST API built with Python and the FastAPI framework. It handles all business logic, including user authentication, content management, database operations, and integration with the Google Gemini AI service. The backend is deployed on Render.

**Database**  
A Neon DB (PostgreSQL) instance serves as the persistent data store. The backend communicates with it via the SQLAlchemy ORM.

This decoupled model provides flexibility and maintainability. For example, the entire frontend could be rebuilt with a different framework (like React or Vue) without requiring any changes to the backend API, as long as the API contract is respected.

## 1.2 Backend Design (FastAPI)

The backend is the core of the application, designed to be robust, scalable, and easy to maintain.

### 1.2.1 Backend Project Structure

The project directory is organized logically to separate concerns:

- **`main.py`** - The main entry point of the FastAPI application. It initializes the app and includes all the API routers.
- **`database.py`** - Configures the SQLAlchemy engine and session management for connecting to the Neon DB database.
- **`models.py`** - Defines the database table structures as Python classes using the SQLAlchemy ORM. It is the single source of truth for the data schema.
- **`schemas.py`** - Contains Pydantic models used for data validation, serialization, and defining the shapes of API request and response bodies. This enforces a strict API contract.
- **`routers/`** - A directory containing modular API endpoints. Each file corresponds to a specific resource (e.g., subjects.py, users.py, quiz_attempts.py), making the API easy to navigate and extend.
- **`auth.py & jwt_handler.py`** - Manages all authentication logic, including password hashing (bcrypt), JWT generation, and token verification.
- **`requirements.txt`** - Lists all Python dependencies for the project.

### 1.2.2 Core Technologies & Design Rationale

**FastAPI**  
Chosen for its high performance (built on Starlette and Uvicorn), automatic interactive API documentation (Swagger UI), and dependency injection system, which simplifies code and improves testability.

**Pydantic**  
Used extensively for data validation. By defining request/response schemas, we ensure that the data flowing into and out of the API is always correctly formatted, reducing runtime errors.

**SQLAlchemy**  
The de-facto ORM for Python, it provides a powerful way to interact with the database using Python objects instead of raw SQL, which helps prevent SQL injection and makes the data access layer more maintainable.

### 1.2.3 Authentication & Authorization Flow

Security is handled via **JSON Web Tokens (JWT)**.

1. **Login**: A user submits their email and password to the `POST /auth/login` endpoint.
2. **Verification**: The backend hashes the provided password with bcrypt and compares it to the stored hash in the users table.
3. **Token Generation**: If credentials are valid, a JWT is created. The token's payload contains the user's ID and role (e.g., `{ "sub": 123, "role": "admin" }`). This token is signed with a secret key.
4. **Client-Side Storage**: The frontend receives the JWT and stores it in localStorage.
5. **Authenticated Requests**: For all subsequent requests to protected endpoints, the frontend includes the JWT in the `Authorization: Bearer <token>` header.
6. **Endpoint Protection**: FastAPI's dependency injection system is used to protect routes:
   - `Depends(get_current_user)`: A dependency that decodes the token, verifies its signature and expiration, and fetches the corresponding user from the database.
   - `Depends(require_admin)`: A dependency that first gets the current user and then checks if their role is 'admin', raising a 403 Forbidden error if not.

### 1.2.4 AI Quiz Generation Module

This is the most complex and innovative feature of the backend, located in `routers/ai_quiz.py`.

#### The Process Flow

1. **File Upload** (`POST /ai-quizzes/generate`): An admin uploads a file (.pdf, .docx, .pptx, .txt) and specifies the desired number of questions.

2. **Temporary Storage**: The file is saved to a temporary location on the server.

3. **Text Extraction**: The system uses a specialized library based on the file extension to extract raw text content:
   - `.pdf`: PyMuPDF (fitz)
   - `.docx`: python-docx
   - `.pptx`: python-pptx
   - `.txt`: Standard file I/O

4. **Prompt Engineering**: The extracted text is injected into a carefully crafted prompt for the Google Gemini Pro model. The prompt instructs the AI to act as an expert exam setter and return a quiz in a specific, strict JSON format, including a title, questions, options, and correct answers.

5. **API Call**: A request is sent to the Gemini API.

6. **Response Parsing**: The AI's response is parsed. The code handles potential markdown formatting (like ````json`) to isolate the pure JSON object.

7. **Return to Frontend**: The generated, unsaved JSON quiz data is sent back to the admin's frontend for review.

8. **Saving the Quiz** (`POST /ai-quizzes/submit`): After the admin reviews and potentially edits the quiz on the frontend, they submit it. The backend receives the final JSON and creates the corresponding records in the quizzes, questions, and options tables in a single database transaction.

## 1.3 Frontend Design (Vanilla JS)

The frontend is designed for simplicity and accessibility, with no reliance on heavy frameworks or a complex build process.

### 1.3.1 Frontend Structure and Rationale

**Structure**  
The application is a multi-page application (MPA). Each major view (e.g., `user_dashboard.html`, `quiz_attempt.html`, `admin/quizzes.html`) is a separate HTML file. Each HTML file has a corresponding JavaScript file (e.g., `js/user_dashboard.js`) that contains all the logic for that page.

**Rationale**
- **Simplicity**: Using Vanilla JS avoids the overhead of a build system (like Webpack or Vite) and the learning curve of a framework. This makes it very easy for any web developer to understand and modify.
- **Performance**: With no large framework libraries to load, the initial page load can be very fast.
- **Maintainability**: Separating logic by page keeps the JavaScript files focused and manageable.

### 1.3.2 State Management

Application state is managed simply and effectively using the browser's localStorage.

- **On Login**: The JWT, user_id, user_name, and user_role are saved to localStorage.
- **On Page Load**: Every page's JavaScript logic first checks localStorage for the existence of a token and the correct role (if it's an admin page). If the token is missing or the role is incorrect, the user is immediately redirected to the index.html login page.
- **On Logout**: The `logout()` function, present in most JS files, clears all items from localStorage and redirects to the login page.

This approach is sufficient for this application's needs, as complex global state that needs to be shared reactively across components is not a primary requirement.

## 1.4 Database Design (Neon DB - PostgreSQL)

The database schema is designed to be relational and normalized to ensure data integrity and minimize redundancy.

### 1.4.1 Table Schema Details

| Table (models.py) | Key Columns | Relationships |
|-------------------|-------------|---------------|
| **users** | id, name, email, password_hash, role | One User has many QuizAttempts |
| **subjects** | id, name, description | One Subject has many Chapters |
| **chapters** | id, name, subject_id (FK) | Belongs to one Subject. Has many Quizzes |
| **quizzes** | id, title, chapter_id (FK), is_ai_generated | Belongs to one Chapter. Has many Questions and QuizAttempts |
| **questions** | id, question_text, quiz_id (FK), type, marks | Belongs to one Quiz. Has many Options |
| **options** | id, option_text, question_id (FK), is_correct | Belongs to one Question |
| **quiz_attempts** | id, user_id (FK), quiz_id (FK), score, attempt_number | A join table connecting a User to a Quiz, representing one attempt |

## 1.5 API Endpoint Documentation

### Authentication

| Method | Endpoint | Description | Secured (Role) |
|--------|----------|-------------|----------------|
| POST | `/auth/register` | Registers a new user with the default 'user' role | Public |
| POST | `/auth/login` | Authenticates a user and returns a JWT | Public |

### User Data

| Method | Endpoint | Description | Secured (Role) |
|--------|----------|-------------|----------------|
| GET | `/users/me` | Fetches the profile of the currently logged-in user | User |
| GET | `/users` | Retrieves a list of all users | Admin |
| POST | `/users/addUser` | Creates a new user (can be 'admin' or 'user') | Admin |
| DELETE | `/users/{user_id}` | Deletes a specified user | Admin |

### Content Management

| Method | Endpoint | Description | Secured (Role) |
|--------|----------|-------------|----------------|
| GET | `/subjects` | Gets a list of all subjects | User |
| POST | `/subjects` | Creates a new subject | Admin |
| PUT | `/subjects/{id}` | Updates an existing subject | Admin |
| DELETE | `/subjects/{id}` | Deletes a subject and its related content | Admin |
| GET | `/chapters/by-subject/{id}` | Gets all chapters for a specific subject | User |
| POST | `/chapters` | Creates a new chapter | Admin |
| GET | `/quizzes/by-chapter/{id}` | Gets all quizzes for a specific chapter | User |
| POST | `/quizzes` | Creates a new (manual) quiz container | Admin |
| POST | `/questions` | Adds a manual question with options to a quiz | Admin |

### AI Quiz Generation

| Method | Endpoint | Description | Secured (Role) |
|--------|----------|-------------|----------------|
| POST | `/ai-quizzes/generate` | Generates quiz JSON from an uploaded file | Admin |
| POST | `/ai-quizzes/submit` | Saves the reviewed AI-generated quiz to the DB | Admin |

### Quiz-Taking & Performance

| Method | Endpoint | Description | Secured (Role) |
|--------|----------|-------------|----------------|
| GET | `/quizzes/{id}/questions` | Fetches a full quiz (questions & options) for an attempt | User |
| POST | `/quiz-attempts` | Submits a user's quiz attempt and saves the score | User |
| GET | `/quiz-attempts/by-user/{id}` | Gets the full quiz history for a specific user | User |
| GET | `/performance/user/{id}` | Returns detailed performance analytics for a user | User / Admin |

### Admin Dashboard

| Method | Endpoint | Description | Secured (Role) |
|--------|----------|-------------|----------------|
| GET | `/admin/dashboard-data` | Retrieves all aggregated data for the admin dashboard | Admin |

## 1.6 Local Development Setup

To run this project locally, you need to set up both the backend and the frontend.

### Prerequisites
- Git
- Python 3.9+
- A running PostgreSQL instance (e.g., via Docker or a local installation)

### 1. Backend Setup

```bash
# Clone the backend repository
git clone https://github.com/ANIMANxd/quizmaster-backend.git
cd quizmaster-backend

# Create and activate a virtual environment
python -m venv venv
# On Windows: venv\Scripts\activate
# On macOS/Linux: source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Create the `.env` file in the root directory:

```env
# Your PostgreSQL connection string from Neon DB or local instance
DATABASE_URL="postgresql://user:password@host:port/dbname"

# Your Google Gemini API Key
GEMINI_API_KEY="your_gemini_api_key_here"

# A secret key for JWT token generation
SECRET_KEY="a_very_long_and_random_secret_string"
ALGORITHM="HS256"
```

```bash
# The database tables are created automatically by main.py on startup.
# Run the FastAPI server:
uvicorn main:app --reload
```

The backend will now be running at `http://127.0.0.1:8000`.

### 2. Frontend Setup

```bash
# Clone the frontend repository in a separate directory
git clone https://github.com/ANIMANxd/quizmaster-frontend.git
cd quizmaster-frontend
```

**Before running, you must point the frontend to your local backend server:**

1. Open the project in your code editor
2. Search for the constant `API_BASE_URL` or `API_URL` in all `.js` files (especially in the `js/` directory and `index.html`)
3. Change its value from `https://quizmaster-backend-cs3d.onrender.com` to `http://127.0.0.1:8000`

Open the `index.html` file in your web browser. The application should now be running and communicating with your local backend.

---

# Part 2: Non-Technical User Manual

*This user manual is designed for individuals who will be using the QuizMaster Pro application, including both students and administrators.*

## 2.1 Introduction for Users

Welcome to **QuizMaster Pro**! This platform is designed to make learning and assessment easy and engaging. As a student, you can take quizzes on various subjects, track your progress, and see how you improve over time. As an administrator, you have powerful tools to manage all the content, users, and even create new quizzes instantly using AI.

## 2.2 For Students: The User Experience

### 2.2.1 Registration and Login

**To Create an Account:**  
Navigate to the homepage. Click on the "Create Account" link, fill in your full name, email, and a strong password, and click "Create Account".

**To Sign In:**  
Enter your registered email and password on the login form and click "Sign In".

### 2.2.2 The User Dashboard

Once you log in, you will land on your main dashboard.

- **Welcome Message**: A personalized greeting with your name
- **Choose a Subject**: The main area displays all available subjects. Click on a subject card to reveal its chapters
- **Select a Chapter**: After clicking a subject, a list of chapters will appear. Click on a chapter tab to see the quizzes available for it
- **Start a Quiz**: The quiz list shows the quiz title and your attempt status (e.g., Start Quiz (0/3)). Click the "Start Quiz" button to begin

### 2.2.3 Taking a Quiz

The quiz attempt screen is a focused environment for you to answer questions.

**Questions Panel**  
The main panel on the left displays all the questions one after another.

**Question Types:**
- **MCQ (Multiple Choice Question)**: Indicated by round radio buttons. You can only select one correct answer
- **MSQ (Multiple Select Question)**: Indicated by square checkboxes. You can select one or more correct answers

**Sidebar**  
The right sidebar shows the quiz title, your past attempt scores for this quiz, and the "Submit Quiz" button.

**Submitting**  
Once you have answered all questions, click "Submit Quiz". Your score will be displayed, and you will be redirected back to the dashboard.

### 2.2.4 Reviewing Your History & Performance

You can access your history and performance from the navigation links in the left sidebar.

**My History**  
This page shows a complete list of every quiz you have attempted, grouped by quiz title. You can see the score and date for each attempt. If you have used all 3 attempts for a quiz, a button will appear allowing you to request a re-attempt from an administrator.

**Performance**  
This is your personal analytics dashboard. It features charts and stats to help you understand your progress:

- **Key Stats**: Your total quizzes taken and overall average score
- **Average Score by Subject**: A bar chart showing your average performance in each subject, making it easy to see your strengths and weaknesses
- **Recent Performance Trend**: A line chart showing your scores over the last 10 attempts, so you can see if you're improving

## 2.3 For Administrators: Managing the Platform

After logging in with an admin account, you are directed to a powerful administrative backend.

### 2.3.1 The Admin Dashboard

This is your mission control. It provides a quick overview of the platform with key metrics:

- Total number of subjects, chapters, quizzes, and users
- A live feed of the most recent quiz attempts by users
- Charts showing the most popular (most attempted) quizzes and the lowest-scoring quizzes, which may indicate difficult content

### 2.3.2 Content Management

Using the sidebar navigation, you can manage all content on the platform. On each management page (Subjects, Chapters, Quizzes), you can:

- **View** all existing items in a table
- **Add** a new item using the "Add New..." button
- **Edit** an existing item using the "Edit" button in its row
- **Delete** an item using the "Delete" button

### 2.3.3 How to Use AI Quiz Generation

This is the most powerful feature for admins. It allows you to create a quiz in seconds from a document.

1. Navigate to the **Quizzes** page from the sidebar
2. Click the **"Create with AI"** button. A modal window will appear
3. **Fill out the form:**
   - Select the Subject and Chapter where the new quiz will belong
   - Enter the number of MCQs and MSQs you want the AI to generate
   - Click "Choose File" and upload a `.pdf`, `.docx`, `.pptx`, or `.txt` document containing the source material for the quiz
4. Click **"Generate Quiz"**. The system will process the file and generate questions
5. **Review and Edit**: A new modal will appear showing the AI-generated quiz, including the title, questions, options, and pre-selected correct answers. You can edit any part of this quiz—fix a typo in a question, change an option, or correct an answer
6. **Save the Quiz**: Once you are satisfied, click "Save Quiz to Database". The new quiz will now be available for users to attempt

### 2.3.4 User Management

Navigate to the **Users** page from the sidebar. Here you can:

**View All Users**  
See a list of every registered user, their email, and their role (user or admin).

**Filter and Search**  
Use the search bar to find a user by name or email, or use the dropdown to filter by role.

**Add a New User**  
Click the "Add New User" button to manually create a new account, and you can assign them the 'user' or 'admin' role directly.

**View Performance**  
Click the "Performance" button on any user's row to see their detailed performance analytics, just as they see it on their own dashboard. This is useful for identifying struggling students.

**Delete a User**  
Click the "Delete" button to permanently remove a user account.

---
