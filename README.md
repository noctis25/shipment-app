# Requirements
## Dev
To import the .gz data into a mysql container 
```
gunzip data.sql.gz
```

```
cat data.sql | docker exec -i {mysql-container} /usr/bin/mysql -u root --password={your password} {mysql db used}
```

Create the use for the app - in mysql
```
CREATE USER 'whitebox'@'%' IDENTIFIED BY {'password'};
```
Grant privilages
```
Grant privilege - GRANT ALL PRIVILEGES ON mysql.rates TO 'whitebox'@'%';
```
