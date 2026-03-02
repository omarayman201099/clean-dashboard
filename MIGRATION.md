# Migration Guide - Enterprise Edition Upgrade

## Overview
This document outlines the step-by-step migration process from the current monolithic server to the new enterprise-grade architecture with zero downtime.

## Current System
- Single `server.js` file with all functionality
- Basic JWT authentication (single token)
- No caching, limited security
- No real-time features

## New System
- Modular clean architecture
- JWT with refresh tokens
- Redis caching
- Socket.IO real-time features
- RBAC, audit logs, soft delete

---

## Phase 1: Preparation (Pre-Migration)

### 1.1 Backup Current System
```
bash
# Backup database
mongodump --db=CleaningStore --out=./backup/mongodb-$(date +%Y%m%d)

# Backup current code
cp -r . ./backup/code-$(date +%Y%m%d)

# Backup uploads
cp -r uploads ./backup/uploads-$(date +%Y%m%d)
```

### 1.2 Update Environment Variables
```
bash
# Copy example env file
cp .env.example .env

# Update with production values
# IMPORTANT: Generate new JWT secrets!
```

### 1.3 Install Dependencies
```
bash
npm install
```

### 1.4 Test New System Locally
```bash
# Run in development mode
npm run dev
```

---

## Phase 2: Zero-Downtime Migration Strategy

### Option A: Blue-Green Deployment (Recommended)

1. **Deploy new version on separate port (3001)**
   
```
bash
   PORT=3001 npm start
   
```

2. **Test new version**
   - Verify all endpoints work
   - Test WebSocket connections
   - Check real-time features

3. **Switch load balancer/nginx**
   - Gradually route traffic to new version
   - Monitor for errors

4. **Decommission old version**
   - Stop old server
   - Keep old code for rollback

### Option B: Rolling Update

1. **Start new server alongside old one**
2. **Use nginx to balance between them**
3. **Gradually increase traffic to new server**
4. **Remove old server**

---

## Phase 3: Database Migrations

### New Fields Added (No Breaking Changes)

The new system adds these optional fields to existing collections:

**Customers Collection:**
- `refreshToken` - JWT refresh token (optional)
- `isActive` - Account status (default: true)
- `lastLogin` - Last login timestamp

**Products Collection:**
- `isActive` - Product visibility
- `lowStockThreshold` - Low stock alert threshold
- `deletedAt` - Soft delete timestamp
- Indexes for performance

**Orders Collection:**
- `orderNumber` - Human-readable order ID
- `statusHistory` - Order status change history
- `deletedAt` - Soft delete timestamp
- Indexes for queries

### Running Migrations
```
bash
# New indexes are created automatically on server start
# Check logs for index creation messages
```

---

## Phase 4: Backward Compatibility

### API Compatibility

The new system maintains backward compatibility with:

1. **Existing API Endpoints** - All old endpoints work the same way
2. **JWT Tokens** - Old tokens continue to work (they'll be valid for 24h)
3. **Response Format** - Same JSON structure maintained

### New Features Available

1. **Refresh Tokens**
   - Use `/api/auth/refresh-token` endpoint
   - Get new access token without re-login

2. **Real-Time Features**
   - Connect via Socket.IO on same port
   - Authenticate with JWT token

3. **Admin Roles**
   - First admin becomes superadmin automatically
   - New RBAC system with permissions

---

## Phase 5: Post-Migration

### Verify Installation
```
bash
# Check health endpoint
curl http://localhost:3000/api/health

# Check stats endpoint
curl http://localhost:3000/api/stats \
  -H "Authorization: Bearer <token>"
```

### Monitor Logs
```
bash
# Watch logs in real-time
tail -f logs/combined.log
```

### Performance Verification
- Check API response times
- Verify Redis caching working
- Test real-time connections

---

## Rollback Plan

If issues occur:

1. **Quick Rollback** - Switch back to old server:
   
```
bash
   # Old server is still running on port 3000 (or 3001)
   # Just point traffic back to it
   
```

2. **Database Rollback**:
   
```
bash
   # Restore from backup
   mongorestore --db=CleaningStore ./backup/mongodb-YYYYMMDD
   
```

3. **Code Rollback**:
   
```
bash
   # Restore old code
   cp -r ./backup/code-YYYYMMDD/* .
   
```

---

## Feature Comparison

| Feature | Old System | New System |
|---------|-----------|------------|
| Architecture | Monolithic | Modular |
| Auth | Basic JWT | JWT + Refresh Tokens |
| Security | Basic | Helmet, Rate Limiting, RBAC |
| Caching | None | Redis |
| Real-Time | None | Socket.IO |
| Orders | Basic | Full Lifecycle + Webhooks |
| Inventory | None | Full Tracking |
| Coupons | None | Full System |
| Logging | Console | Winston Files |
| Testing | None | Jest + Supertest |
| Docker | None | Full Support |

---

## Support

For issues during migration:
1. Check logs in `logs/` directory
2. Verify environment variables in `.env`
3. Ensure MongoDB and Redis are running
4. Check network/firewall settings
