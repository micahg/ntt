FROM nginx:1.17.3

# Create app directory
RUN mkdir /var/www/
WORKDIR /var/www/

# Github Action is a secondary step that pulls tgz rather than working with build output
COPY package/build/ /var/www/
COPY k8s/nginx-custom.conf /etc/nginx/conf.d/default.conf

CMD ["/bin/sh",  "-c",  "envsubst < /var/www/env.template.json > /var/www/env.json && exec nginx -g 'daemon off;'"]
