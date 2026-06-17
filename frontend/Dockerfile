# ============================================================
# FreightHub frontend — статический сайт за nginx + reverse proxy.
# Сборки нет (vanilla HTML/CSS/JS), поэтому образ однослойный.
# ============================================================
FROM nginx:1.27-alpine

# свой конфиг вместо дефолтного
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# статика сайта
COPY site/ /usr/share/nginx/html/

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=5 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
