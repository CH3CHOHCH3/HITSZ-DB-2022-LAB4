/* 用于处理正常浏览请求 */
var express = require('express');
var router = express.Router();
var conn = require('../utils/mysql');

/* 检查是否为管理员 */
var admin_check = function(req, res, next) {
  if (req.signedCookies.userinfo.isadmin) {
    next();
  } else {
    res.redirect('/');
  }
}

/* 查看特定活动信息 */
router.get('/activity/:id', function(req, res, next){
  conn.query('SELECT * FROM activities WHERE `id`=?', [req.params.id], function(err, result) {
    if (err) {
      res.send(err.message);
    } else {
      // console.log(result[0]);
      res.render('activity', {
        username: req.signedCookies.userinfo.username,
        isadmin: req.signedCookies.userinfo.isadmin,
        activity: result[0]
      });
    }
  });
})

/* 主页显示可参加的活动 */
router.get('/', function(req, res, next) {
  conn.query('SELECT * FROM activities', function(err, result) {
    if (err) {
      res.send(err.message);
    } else {
      /* 活动按照日期排序 */
      result.sort(function(a, b){
        return a.time < b.time ? 1 : -1;
      })
      /* 主页只需显示活动标题和日期*/
      let activities = [];
      for(let i = 0; i < result.length; ++i){
        activities.push({
          "id": result[i].id,
          "title": result[i].title,
          "datetime": JSON.stringify(result[i].time).slice(1, 11)
        })
      }
      res.render('home', {
        username: req.signedCookies.userinfo.username,
        isadmin: req.signedCookies.userinfo.isadmin,
        count: result.length,
        activities: activities
      });
    }
  });
});

/* 查看自己提出的申请 */
router.get('/applications', function(req, res, next) {
  conn.query('SELECT activities.title,applications.status FROM applications, activities WHERE applications.activity=activities.id AND applications.applicant=?', [req.signedCookies.userinfo.uid], function(err, result){
    if (err) {
      res.send(err.message);
    } else {
      res.render('applications', {
        username: req.signedCookies.userinfo.username,
        isadmin: req.signedCookies.userinfo.isadmin,
        count: result.length,
        applications: result
      })
    }
  });
});

/* 管理员查看自己发起的活动 */
router.get('/activities', admin_check, function(req, res, next) {
  conn.query('SELECT * FROM activities WHERE `uid`=?', [req.signedCookies.userinfo.uid], function(err, result) {
    if (err) {
      res.send(err.message);
    } else {
      /* 活动按照日期排序 */
      result.sort(function(a, b){
        return a.time < b.time ? 1 : -1;
      })
      /* 主页只需显示活动标题和日期*/
      let activities = [];
      for(let i = 0; i < result.length; ++i){
        activities.push({
          "id": result[i].id,
          "title": result[i].title,
          "datetime": JSON.stringify(result[i].time).slice(1, 11)
        })
      }
      res.render('activities', {
        username: req.signedCookies.userinfo.username,
        count: result.length,
        activities: activities
      });
    }
  })
});

/* 管理员发布新活动 */
router.post('/create_activity', admin_check, function(req, res, next) {
  let title = req.body.title;
  let category = req.body.category;
  let datetime = req.body.datetime;
  let location = req.body.location;
  let hc = req.body.hc;
  let desc = req.body.desc;

  conn.query('INSERT INTO activities(`category_id`, `uid`, `title`, `time`, `location`, `hc`, `desc`, `status`)VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
    [parseInt(category), req.signedCookies.userinfo.uid, title, datetime, location, parseInt(hc), desc, 1],
    function(err, result) {
      if (err) {
        res.json({message: err.message});
      } else {
        /* 发布成功 */
        res.redirect('/activities');
      }
  })
});

/* 用户申请活动 */
router.post('/apply/:id', function(req, res, next) {
  // status
  // - 0 : 待审核
  // - 1 : 通过
  // - 2 : 拒绝
  conn.query('INSERT INTO applications(`time`, `applicant`, `reason`, `comment`, `status`, `activity`)VALUES(NOW(), ?, ?, ?, ?, ?)',
    [req.signedCookies.userinfo.uid, req.body.reason, null, 0, req.params.id],
    function(err, result) {
      if (err) {
        res.json({message: err.message});
      } else {
        /* 申请成功 */
        res.redirect('/applications');
      }
  })
});

/* 管理员审核特定活动申请的页面 */
router.get('/review/:id', admin_check, function(req, res, next) {
  /* 首先判断是否为该管理员发起的活动 */
  conn.query('SELECT * FROM activities WHERE `id`=? AND `uid`=?',
    [req.params.id, req.signedCookies.userinfo.uid],
    function(err, result) {
      if (err) {
        res.send(err.message);
      } else {
        if (result.length < 1) {
          /* 不是该管理员发起的活动 */
          res.send('This is not an activity you initiated.');
        } else {
          /* 查询并返回该活动的所有申请 */
          let title = result[0].title;
          conn.query('SELECT users.`username`,applications.* FROM applications,users WHERE applications.`activity`=? AND users.`uid`=applications.`applicant`', [req.params.id], function(err, result) {
            res.render('review', {
              username: req.signedCookies.userinfo.username,
              title: title,
              count: result.length,
              applications: result
            })
          })
        }
      }
  })
})

/* 通过申请 */
router.post('/accept/:id', admin_check, function(req, res, next) {
  /* 查询该管理员是否有权限审核该申请 */
  conn.query('SELECT activities.uid FROM applications,activities WHERE applications.`id`=? AND applications.`activity`=activities.`id`', [req.params.id], function(err, result) {
    if (err) {
      res.json({
        success: 0,
        message: err.message
      });
    } else if (result.length != 1) {
      /* 权限不足 */
      res.json({
        success: 0,
        message: 'Permission Denied.'
      });
    } else {
      /* 将申请的 status 更新为 1 */
      conn.query('UPDATE applications SET `status`=1 WHERE `id`=?', [req.params.id], function(err, result){
        if (err) {
          res.json({
            success: 0,
            message: err.message
          });
        } else {
          res.json({
            success: 1
          });
        }
      });
    }
  })
})

/* 拒绝申请 */
router.post('/reject/:id', admin_check, function(req, res, next) {
  /* 查询该管理员是否有权限审核该申请 */
  conn.query('SELECT activities.uid FROM applications,activities WHERE applications.`id`=? AND applications.`activity`=activities.`id`', [req.params.id], function(err, result) {
    if (err) {
      res.json({
        success: 0,
        message: err.message
      });
    } else if (result.length != 1) {
      /* 权限不足 */
      res.json({
        success: 0,
        message: 'Permission Denied.'
      });
    } else {
      /* 将申请的 status 更新为 2 */
      conn.query('UPDATE applications SET `status`=2 WHERE `id`=?', [req.params.id], function(err, result){
        if (err) {
          res.json({
            success: 0,
            message: err.message
          });
        } else {
          res.json({
            success: 1
          });
        }
      });
    }
  })
})

module.exports = router;