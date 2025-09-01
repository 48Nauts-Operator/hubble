# == Hubble Bookmark Dashboard ==
server {
      listen 443 ssl;
      server_name hubble.blockonauts.io;

      include             /etc/letsencrypt/options-ssl-nginx.conf;
      ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

      # API → backend (PORT 8889)
      location /api/ {
          proxy_pass          http://localhost:8889/api/;
          proxy_http_version  1.1;
          proxy_set_header    Host               $host;
          proxy_set_header    X-Real-IP          $remote_addr;
          proxy_set_header    X-Forwarded-For    $proxy_add_x_forwarded_for;
          proxy_set_header    X-Forwarded-Proto  $scheme;
          client_max_body_size 10M;
          proxy_read_timeout   60s;
          proxy_send_timeout   60s;
      }

      # WebSocket support for Socket.io (Real-time updates)
      location /socket.io/ {
          proxy_pass          http://localhost:8889/socket.io/;
          proxy_http_version  1.1;
          proxy_set_header    Upgrade            $http_upgrade;
          proxy_set_header    Connection         "upgrade";
          proxy_set_header    Host               $host;
          proxy_set_header    X-Real-IP          $remote_addr;
          proxy_set_header    X-Forwarded-For    $proxy_add_x_forwarded_for;
          proxy_set_header    X-Forwarded-Proto  $scheme;
          proxy_buffering     off;
          proxy_read_timeout  86400;
      }

      # MCP Server endpoint (PORT 9900)
      location /mcp/ {
          proxy_pass          http://localhost:9900/;
          proxy_http_version  1.1;
          proxy_set_header    Host               $host;
          proxy_set_header    X-Real-IP          $remote_addr;
          proxy_set_header    X-Forwarded-For    $proxy_add_x_forwarded_for;
          proxy_set_header    X-Forwarded-Proto  $scheme;
          proxy_read_timeout   30s;
          proxy_send_timeout   30s;
      }

      # Health check endpoint
      location /health {
          proxy_pass          http://localhost:8889/api/health;
          proxy_set_header    Host               $host;
      }

      # Everything else → frontend (PORT 8888)
      location / {
          proxy_pass          http://localhost:8888/;
          proxy_http_version  1.1;
          proxy_set_header    Host               $host;
          proxy_set_header    X-Real-IP          $remote_addr;
          proxy_set_header    X-Forwarded-For    $proxy_add_x_forwarded_for;
          proxy_set_header    X-Forwarded-Proto  $scheme;

          proxy_set_header    Upgrade            $http_upgrade;
          proxy_set_header    Connection         $connection_upgrade;

          proxy_buffering     off;
          proxy_request_buffering off;

          proxy_buffer_size   128k;
          proxy_buffers       4 256k;
          proxy_busy_buffers_size 256k;
          proxy_temp_file_write_size 256k;

          proxy_read_timeout  300s;
          proxy_send_timeout  300s;
    }
  }

# ----------------------------------------------
# Port Summary:
# Frontend:    8888  (React Dashboard UI)
# Backend API: 8889  (Express REST API)
# MCP Server:  9900  (Model Context Protocol)
# ----------------------------------------------