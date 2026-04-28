# Cloud File Storage System

A **frontend-only** web application that simulates a Cloud File Storage System (similar to Google Drive) using a simulated HDFS (Hadoop Distributed File System) approach.

## 🌟 Features

### 1. **Authentication**
- Login and Signup pages with frontend validation
- User data stored in IndexedDB
- Session management using localStorage tokens
- Password hashing with SHA256

### 2. **Dashboard UI**
- Clean, modern responsive interface
- File list with metadata (filename, size, upload date, chunk count)
- Upload and Download buttons
- Delete functionality with confirmation modal
- Real-time statistics sidebar

### 3. **File Upload**
- Drag-and-drop support
- Multiple file selection
- FileReader API for client-side file reading
- Progress bar with real-time updates

### 4. **File Encryption**
- AES encryption using CryptoJS library
- Unique encryption key per user (derived from email)
- Secure chunk storage
- No server-side encryption overhead

### 5. **File Chunking**
- Automatic file splitting into 1MB chunks
- Metadata tracking for each chunk
- Index-based chunk ordering for proper reconstruction

### 6. **Simulated HDFS Storage**
- **3 Virtual Nodes**: Node1, Node2, Node3
- Random chunk distribution across nodes (HDFS simulation)
- Node status tracking showing chunk count
- Distributed storage metadata management

### 7. **IndexedDB Storage**
- Persistent local storage using IndexedDB
- Multiple object stores:
  - `users`: User account data
  - `files`: File metadata
  - `chunks`: Encrypted file chunks
  - `nodeStorage`: Virtual node information

### 8. **File Download**
- Chunk retrieval from virtual nodes
- Proper chunk ordering and merging
- Automatic decryption
- Browser download trigger

### 9. **Additional Features**
- Upload progress tracking
- File statistics (total size, file count)
- Node distribution statistics
- Storage optimization simulation
- Error handling and validation
- Responsive design for mobile and desktop

## 📁 Project Structure

```
Cloud File Storage System/
├── index.html          # Login/Signup page
├── dashboard.html      # Main dashboard
├── style.css          # Global styling
└── app.js             # Application logic
```

## 🚀 How to Use

### 1. **Open the Application**
Simply open `index.html` in a modern web browser:
```
file:///path/to/Cloud%20File%20Storage%20System/index.html
```

### 2. **Sign Up**
- Click "Sign up" link on login page
- Enter your name, email, and password
- Confirm password and submit

### 3. **Login**
- Enter registered email and password
- Click "Login" button

### 4. **Upload Files**
- Drag and drop files onto the upload box, OR
- Click the upload box to select files
- Monitor progress bar
- Files are encrypted and distributed

### 5. **View Files**
- All uploaded files appear in the "Your Files" section
- See file size, chunk count, and upload date
- Node distribution shows where chunks are stored

### 6. **Download Files**
- Click the download button on any file card
- Chunks are retrieved from nodes and decrypted
- File automatically downloads

### 7. **Delete Files**
- Click delete button on any file
- Confirm deletion in modal
- File and all chunks are removed

## 🔐 Security & Storage

### Encryption Details
- **Algorithm**: AES-GCM (256-bit, via Web Crypto API)
- **Key Derivation**: PBKDF2 with SHA-256 (100,000 iterations)
- **IV**: Random 12-byte IV per chunk
- **Data**: All chunks encrypted before storage
- **Storage**: IndexedDB (browser local storage)
- **Authentication**: Password hashing using SHA-256

### Storage Details
- **Chunk Size**: 1MB per chunk
- **Distribution**: Random across 3 virtual nodes
- **Metadata**: File name, size, chunks, upload date
- **Persistence**: All data stored locally in browser

## 🏗️ Architecture

### Class Structure

#### **StorageManager**
- Manages IndexedDB operations
- Handles CRUD operations for all data stores

#### **EncryptionManager**
- Key generation (SHA256)
- AES encryption/decryption
- Binary data encryption support

#### **FileChunkingManager**
- File chunking (1MB chunks)
- Chunk merging
- HDFS-style distribution simulation

#### **AuthManager**
- User registration (signup)
- User authentication (login)
- Session management
- Token generation

#### **FileManager**
- File upload with chunking and encryption
- File download with decryption and merging
- File deletion with cleanup
- Statistics collection
- Node storage management

#### **UIManager**
- UI state management
- File list rendering
- Statistics display
- User feedback (errors, progress)
- HTML escaping for security

## 💾 Data Structures

### User Object
```javascript
{
    email: "user@example.com",
    name: "User Name",
    password: "hashed_password",
    createdAt: "2024-01-01T00:00:00Z"
}
```

### File Metadata
```javascript
{
    id: "unique_file_id",
    name: "filename.pdf",
    originalName: "filename.pdf",
    type: "application/pdf",
    size: 1048576,
    chunks: ["chunk_id_0", "chunk_id_1", ...],
    distribution: {
        node1: [0, 2],
        node2: [1],
        node3: []
    },
    uploadDate: "2024-01-01T00:00:00Z",
    userEmail: "user@example.com"
}
```

### Chunk Data
```javascript
{
    chunkId: "file_id_chunk_0",
    fileId: "unique_file_id",
    index: 0,
    encryptedData: "encrypted_base64_string",
    size: 1048576,
    node: "node1"
}
```

## 🎯 HDFS Simulation

The application simulates HDFS concepts:

1. **File Chunking**: Large files split into 1MB chunks
2. **Distributed Storage**: Chunks randomly distributed across 3 virtual nodes
3. **Replication**: File metadata maintains chunk-to-node mapping
4. **Retrieval**: Chunks retrieved from respective nodes and merged
5. **Node Status**: Dashboard shows chunk count per node

## 🌐 Browser Compatibility

- **Chrome/Chromium**: ✅ Full support
- **Firefox**: ✅ Full support
- **Safari**: ✅ Full support
- **Edge**: ✅ Full support

**Requirements:**
- Modern browser with IndexedDB support
- JavaScript enabled
- No backend server required

## 📦 Dependencies

**Zero External Dependencies!** 

The application uses only native browser APIs:
- **Web Crypto API**: Native AES-GCM encryption (built into all modern browsers)
- **IndexedDB**: Native browser storage
- **FileReader API**: Native file reading
- **No CDN required**: Everything runs locally

This makes the app:
- ✅ Faster (no external requests)
- ✅ More secure (no third-party libraries)
- ✅ More reliable (no CDN dependencies)
- ✅ Fully offline capable

## ⚠️ Important Notes

1. **Data Persistence**: All data stored locally in browser IndexedDB
2. **Private Browsing**: Data cleared when incognito/private window closed
3. **Browser Storage Limits**: Typically 50MB-50GB depending on browser
4. **No Backend**: This is 100% frontend - no server communication
5. **Encryption**: Uses client-side encryption - server has no access to keys
6. **Demo Purposes**: The HDFS simulation is conceptual for learning purposes

## 🔄 Data Flow

```
1. Upload:
   File → Chunks → Encrypt → Distribute to Nodes → Store Metadata

2. Download:
   Retrieve from Nodes → Decrypt → Merge → Download

3. Delete:
   Delete from Nodes → Delete Chunks → Delete Metadata
```

## 🛠️ Technical Details

### File Upload Process
1. User selects file
2. FileReader API reads file as ArrayBuffer
3. File split into 1MB chunks
4. Each chunk encrypted with AES
5. Chunks distributed randomly across 3 nodes
6. Chunk metadata and file metadata stored in IndexedDB
7. Progress updates sent to UI

### File Download Process
1. Retrieve all chunk IDs for file
2. Fetch each chunk from IndexedDB
3. Decrypt each chunk
4. Sort chunks by index
5. Merge chunks into single ArrayBuffer
6. Create Blob and trigger browser download

## 📊 UI Components

- **Navbar**: User info and logout
- **Sidebar**: Storage stats and node status
- **Upload Section**: Drag-drop and file input
- **Files List**: Grid of file cards with actions
- **Progress Bar**: Real-time upload progress
- **Delete Modal**: Confirmation before deletion
- **Error Messages**: User feedback

## 🎨 Styling

- Modern card-based UI
- Gradient backgrounds
- Responsive grid layout
- Smooth animations
- Color-coded status indicators
- Mobile-friendly design

## 🚀 Performance Optimization

- Lazy loading of file lists
- IndexedDB for fast local access
- Efficient chunk distribution
- Progress tracking without blocking UI
- Minimal DOM operations

---

**Created**: January 2024  
**Type**: Frontend-only Web Application  
**License**: MIT (use freely for educational purposes)
