FROM nginx:alpine
WORKDIR /usr/share/nginx/html
RUN rm -rf ./*
COPY index.html agenda.html mx-runtime.js morphdom.min.js logo-icon.png favicon.ico favicon-32.png apple-touch-icon.png /tmp/site/
RUN mkdir -p assets agenda \
 && mv /tmp/site/index.html ./index.html \
 && mv /tmp/site/favicon.ico /tmp/site/favicon-32.png /tmp/site/apple-touch-icon.png ./ \
 && mv /tmp/site/mx-runtime.js /tmp/site/morphdom.min.js /tmp/site/logo-icon.png assets/ \
 && sed 's#assets/#../assets/#g' /tmp/site/agenda.html > agenda/index.html
EXPOSE 80
