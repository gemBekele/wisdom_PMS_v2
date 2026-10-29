# SAKO PMS - Production Deployment Guide

## Database Setup (PostgreSQL)

### 1. Database Created
✅ Database `sako_pms` created successfully
✅ Migrations applied - All tables created
✅ Admin user seeded - admin@sako.com / admin123

### 2. Connection Details
```
Database: sako_pms
User: postgres
Password: postgres
Host: localhost
Port: 5432
URL: postgresql://postgres:postgres@localhost:5432/sako_pms
```

## Backend Configuration

### Environment Variables (.env)
```env
PORT=5000
NODE_ENV=production
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sako_pms?schema=public"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d
CORS_ORIGIN=https://your-domain.com
```

### Available Scripts
- `npm run start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run seed` - Seed admin user
- `npm run seed:all` - Seed all test users
- `npm run db:migrate` - Run database migrations
- `npm run db:deploy` - Deploy migrations to production
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Frontend Configuration

### Build for Production
```bash
cd frontend
npm run build
```

The build will be created in `frontend/dist/` directory.

## Deployment Options

### Option 1: VPS/Server (Recommended)

1. **Install PM2 for process management:**
```bash
npm install -g pm2
```

2. **Start backend with PM2:**
```bash
cd backend
pm2 start src/server.js --name "sako-pms-backend"
pm2 save
pm2 startup
```

3. **Serve frontend with Nginx:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /path/to/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Docker Deployment

Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  db:
    image: postgres:14
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: sako_pms
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
  
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:postgres@db:5432/sako_pms
      JWT_SECRET: your-secret-key
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      - db
  
  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Option 3: Cloud Platforms

#### Render.com (Free)
1. Connect your GitHub repo
2. Create PostgreSQL database
3. Set environment variables
4. Deploy automatically

#### Railway.app (Free tier available)
1. Import project
2. Add PostgreSQL database
3. Set environment variables
4. Deploy

#### Heroku
1. Create app: `heroku create sako-pms`
2. Add PostgreSQL: `heroku addons:create heroku-postgresql:mini`
3. Deploy: `git push heroku main`

## Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use strong PostgreSQL password
- [ ] Enable HTTPS/SSL
- [ ] Set up firewall rules
- [ ] Change default admin password after first login
- [ ] Enable CORS only for your domain
- [ ] Set up database backups

## Backup Database

```bash
# Create backup
pg_dump -U postgres sako_pms > backup.sql

# Restore backup
psql -U postgres sako_pms < backup.sql
```

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo service postgresql status

# Restart PostgreSQL
sudo service postgresql restart

# Check connection
psql -U postgres -d sako_pms -c "SELECT 1;"
```

### Prisma Issues
```bash
# Regenerate client
npx prisma generate

# Reset database (DANGER: Deletes all data)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

## Quick Start Commands

```bash
# 1. Start PostgreSQL
sudo service postgresql start

# 2. Start backend (dev mode)
cd backend && npm run dev

# 3. Start frontend (dev mode)
cd frontend && npm run dev

# Production deployment
cd backend && npm start
cd frontend && npm run build && serve -s dist
```

## ✅ Summary - What Was Done

1. ✅ Converted all Mongoose scripts to Prisma
2. ✅ Created PostgreSQL database `sako_pms`
3. ✅ Applied Prisma migrations (all tables created)
4. ✅ Seeded admin user (admin@sako.com / admin123)
5. ✅ Removed MongoDB/mongoose dependencies
6. ✅ Added Prisma CLI scripts to package.json
7. ✅ Tested backend - working correctly
8. ✅ Installed frontend dependencies

**Your app is ready to run!**
