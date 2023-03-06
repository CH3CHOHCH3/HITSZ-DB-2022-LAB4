/* 用于处理登录、注册、登出等请求 */
var express = require('express');
var router = express.Router();
var conn = require('../utils/mysql');

/* 登录请求 */
router.post('/login', function(req, res, next) {
  let username = req.body.username;
  let password = req.body.password;
  
  conn.query('SELECT * FROM users WHERE `username`=? AND `password`=?', [username, password], function(err, result){
    if (err) {
      res.json({message: err.message});
      return;
    }
    if (result.length == 0) {
      /* 用户名或密码错误 */
      res.json({message: 'The username or password is wrong.'});
    } else {
      /* 登录成功，设置 cookie */
      res.cookie('userinfo', {
        uid: result[0].uid,
        isadmin: result[0].isadmin,
        username: result[0].username
      },{
        httpOnly: true,
        maxAge: 1000*60*60,   // 一小时过期
        signed: true          // 对 cookie 签名以防用户篡改
      });
      res.redirect('/');
    }
  })
});

/* 注册请求 */
router.post('/register', function(req, res, next) {
  let username = req.body.username;
  let password = req.body.password;
  let isadmin = req.body.isadmin;

  conn.query('SELECT * FROM users WHERE `username`=?', [username], function(err, result){
    if (err) {
      res.json({message: err.message});
      return;
    }
    if (result.length > 0) {
      /* 用户名重复 */
      res.json({message: 'The username has been used.'});
    } else {
      /* 向用户表插入信息 */
      conn.query('INSERT INTO users(`username`, `password`, `isadmin`)VALUES(?, ?, ?)', [username, password, isadmin], function(err, result){
        if (err) {
          res.json({message: err.message});
          return;
        }
        /* 注册成功 */
        res.redirect('/htmls/register_success.html');
      });
    }
  });
});

/* 登出请求 */
router.get('/logout', function(req, res, next) {
  res.cookie('userinfo', req.signedCookies, {
    httpOnly: true,
    maxAge: 0,           // 立即过期即可实现登出
    signed: true          
  });
  res.redirect('/');
});

module.exports = router;