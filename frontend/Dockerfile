FROM node:20-alpine

WORKDIR /app

# najpierw zależności żeby działał cache
COPY package*.json ./
RUN npm ci

# teraz reszta źródeł
COPY . .

EXPOSE 5173

# Vite dev server, dostępny z hosta
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
