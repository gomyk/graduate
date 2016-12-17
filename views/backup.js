"use strict"

var fs = require('fs');
var path = require('path');
require('date-utils');
var temp;
var net = require('net');
var myParser = require("body-parser");
var express = require('express');
var http = require('http');
var DecisionTree = require('decision-tree');
var datas  = "NULL";
var utf8 = require('utf8');
let kmaWeather = require('kma-js').Weather;
var weatherdata;
var weathersum;
var Forecast = require('forecast');
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('newdata7.db');
var insertDB = db.prepare("INSERT INTO SCEDULE VALUES (?,?,?,?,?,?,?,?,?)");
var insertWhatTemp = db.prepare("INSERT INTO WHATTEMP VALUES(?,?,?,?,?,?)");
var updateWhatTemp = db.prepare("UPDATE WHATTEMP SET TEMPMINUS = ? ,TEMP0005 = ?,TEMP0510 = ?,TEMP1015 = ?,TEMP1520 = ? WHERE WHATDATA = ?");

//var insertSDB = db.prepare("INSERT INTO SUMMARY VALUES (?,0,?,0)");
//var updatePDB =db.prepare("UPDATE SUMMARY SET PCOUNT = ? WHERE PLACE = ?");
//var updateWDB = db.prepare("UPDATE SUMMARY SET WCOUNT = ? WHERE WHATDATA = ?");
var schedulelist = [];
//decision tree
var features = ["WHATDATA","WHEREDATA","WITHDATA","SUMDATA"];
//               시간      할일       장소        같이        온도       날씨
var class_name = "FINISHED";
var slicewhat = ['을','를','하기','해라'];
var slicewhere = ['에서','에','가서','로','으로'];
var slicewith = ['랑','와','과','이랑'];
var sliceuntil = ['까지','동안'];

// Initialize
var FCM = require('fcm-node');

var serverKey = 'AIzaSyCs7h9Rpm_tJMpKLJiZ7hIvZDA55jISZEs';
var fcm = new FCM(serverKey);

var forecast = new Forecast({
  service: 'forecast.io',
  key: '323a742b0fb983780d126d57aa25736f',
  units: 'celcius',
  cache: true,
  ttl: {
    minutes: 27,
    seconds: 45
    }
});


db.serialize(function () {
  //db.run("CREATE TABLE if not exists DATA (DATE TEXT,TIME TEXT,WHATDATA TEXT,WHEREDATA TEXT)");
  //db.run("CREATE TABLE if not exists SUMMARY (PLACE TEXT,PCOUNT INT,WHATDATA TEXT,WCOUNT INT)");
  db.run("CREATE TABLE if not exists SCEDULE (DATE TEXT,TIME TEXT,WHATDATA TEXT,WHEREDATA TEXT,WITHDATA TEXT,UNTILDATA TEXT,TEMPDATA TEXT,SUMDATA TEXT,FINISHED TEXT)");
  db.run("CREATE TABLE if not exists WHATTEMP (WHATDATA TEXT,TEMPMINUS INT,TEMP0005 INT,TEMP0510 INT,TEMP1015 INT,TEMP1520 INT)");
});

forecast.get([37.5, 127], function(err, weather) {
  if(err) return console.dir(err);
   console.log(weather.currently);
   weathersum= weather.currently.summary;
   weatherdata=weather.currently.temperature;
      //console.log(weather.currently);
});

// Google Developer���� ������ Server API Key
var registrationIds = [];
// Device Token
//var token = "eaNuVzNuCug:APA91bHzocQq84Sx9Mn7W5JuQyC-Lh8jtAymQ4IBW57saEyzGlRVybbPhP4_O9GuGcf_gTcrzCvBqg_8ox5ghZxqGdj1gOYlqTlvEX-8dpMfOQvBV9kuWIU-60NbMEiRt2tp65MJ3bsi";
//registrationIds.push(token);

function test()
{
  var count =0;
  var max = 0;
  schedulelist = [];
  forecast.get([37.5, 127], function(err, weather) {
    if(err) return console.dir(err);
     console.log(weather.currently);
     weatherdata=weather.currently.temperature;
        //console.log(weather.currently);
  });
  db.serialize(function () {
    db.each("SELECT COUNT(*) as RESULT FROM SCEDULE",function(err, row) {
        //console.log('max:', row.RESULT);
        max = row.RESULT;
        if(max ==0){
            //res.render('view', { title: 'example'});
        }
    });
    db.each("SELECT * FROM SCEDULE",function(err, row) {
    //  console.log('REUSLT:', row);

      if(max!=0){
        schedulelist.push(row);
      }
      if(max == count){
      }
    });
  });

  setTimeout(test,30000);
}

test();

var app = express(),
    server = http.createServer(app);
    server.listen(3000);
    app.use(myParser.urlencoded({extended : true}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.get('/', function(req, res) {
      //res.send(200, "Welcome to server");

        var data = [];
        var data2 = [];
        var count = 0;
        var count2 = 0;
        var max = 0;
        var max2 =0;
        db.serialize(function () {
          db.each("SELECT COUNT(*) as RESULT FROM SCEDULE",function(err, row) {
              //console.log('max:', row.RESULT);
              max = row.RESULT;
              if(max ==0){
                  //res.render('view', { title: 'example'});
              }
          });
          db.each("SELECT * FROM SCEDULE",function(err, row) {
            //console.log('REUSLT:', row);

            if(max!=0){
              data[count] = row;
                count++;
            }
            if(max == count){
            }
          });
          db.each("SELECT COUNT(*) as RESULT FROM WHATTEMP",function(err, row) {
              //console.log('max:', row.RESULT);
              max2 = row.RESULT;
              if(max2 ==0){
                  res.render('view', { title: 'example'});
              }
          });
          db.each("SELECT * FROM WHATTEMP",function(err, row) {
            //console.log('REUSLT:', row);

            if(max!=0){
              data2[count2] = row;
                count2++;
            }
            else{
              res.render('view',{title:'example',count:count,data:JSON.stringify(data),count2:count2,data2:JSON.stringify(data2)});
            }
            if(max2 == count2){
               res.render('view',{title:'example',count:count,data:JSON.stringify(data),count2:count2,data2:JSON.stringify(data2)});
            }
          });
        });
});

app.post('/',function(req,res){
  console.log("완료된 목록");
  console.log(schedulelist);
  var wheredata='none';
  var whatdata = 'none';
  var withdata = 'none';
  var untildata = 'none';
  var finisheddata = 'yes';
  var data = [];
  var count = 0;
  var max = 0;
  var pcheck = false;
  var wcheck = false;
  var string = req.body.message;
  var stringArray = string.split(" ");

    var n = -1;
    //장소
    for(var i=0;i<stringArray.length;i++){
      for(var j=0;j<slicewhere.length;j++){
        if(stringArray[i].indexOf(slicewhere[j]) != -1){
          n = stringArray[i].indexOf(slicewhere[j])
          wheredata = stringArray[i].slice(0,n);
        }
      }
    }
  n = -1;
  //until
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<sliceuntil.length;j++){
      if(stringArray[i].indexOf(sliceuntil[j]) != -1){
        n = stringArray[i].indexOf(sliceuntil[j])
        untildata = stringArray[i].slice(0,n);
      }
    }
  }
  n = -1;
  //with
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<slicewith.length;j++){
      if(stringArray[i].indexOf(slicewith[j]) != -1){
        n = stringArray[i].indexOf(slicewith[j])
        withdata = stringArray[i].slice(0,n);

      }
    }
  }
  n = -1;
  //with
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<slicewhat.length;j++){
      if(stringArray[i].indexOf(slicewhat[j]) != -1){
        n = stringArray[i].indexOf(slicewhat[j])
        whatdata = stringArray[i].slice(0,n);
      }
    }
  }
  n = -1;
  //special code
  finisheddata = 'yes';

  if(whatdata == 'none'){
    for(var j=0;j<stringArray.length;j++){
      for(var i=0;i< schedulelist.length;i++){
        if(schedulelist[i].WHATDATA == stringArray[j] ){
          whatdata = schedulelist[i].WHATDATA;
        }
      }
    }
  }
  if(wheredata == 'none'){
    for(var j=0;j<stringArray.length;j++){
      for(var i=0;i< schedulelist.length;i++){
        if(schedulelist[i].WHEREDATA == stringArray[j] ){
          wheredata = schedulelist[i].WHEREDATA;
        }
      }
    }
  }

  if(whatdata == "none"){
      whatdata = stringArray[stringArray.length-1];
  }

  console.log('what :', whatdata);
  console.log('where :', wheredata);
  console.log('with :', withdata);
  console.log('until :', untildata);
  //where , and what


  insertDB.run(req.body.date,'withDate',whatdata,wheredata,withdata,untildata,weatherdata,weathersum,finisheddata);
  db.serialize(function () {
    db.each("SELECT COUNT(*) as RESULT FROM WHATTEMP WHERE WHATDATA = ?",whatdata,function(err, row) {
      //  console.log('max:', row.RESULT);
        max = row.RESULT;
        if(max ==0){
          if(weatherdata < 0){
              insertWhatTemp.run(whatdata,1,0,0,0,0);
          }
          else if(weatherdata <5){
              insertWhatTemp.run(whatdata,0,1,0,0,0);
          }
          else if(weatherdata <10){
              insertWhatTemp.run(whatdata,0,0,1,0,0);
          }
          else if(weatherdata < 15){
                insertWhatTemp.run(whatdata,0,0,0,1,0);
          }
          else if(weatherdata <20){
                insertWhatTemp.run(whatdata,0,0,0,0,1);
          }
        }
    });
    db.each("SELECT * FROM WHATTEMP",function(err, row) {
      //console.log('REUSLT:', row);

      if(max!=0){
        if(weatherdata < 0){
            updateWhatTemp.run(row.TEMPMINUS+1,row.TEMP0005,row.TEMP0510,row.TEMP1015,row.TEMP1520,whatdata);
        }
        else if(weatherdata <5){
            updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005+1,row.TEMP0510,row.TEMP1015,row.TEMP1520,whatdata);
        }
        else if(weatherdata <10){
            updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005,row.TEMP0510+1,row.TEMP1015,row.TEMP1520,whatdata);
          }
          else if(weatherdata < 15){
              updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005,row.TEMP0510,row.TEMP1015+1,row.TEMP1520,whatdata);
          }
          else if(weatherdata <20){
              updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005,row.TEMP0510,row.TEMP1015,row.TEMP1520+1,whatdata);
          }
      }
      else{
      }
    });
  });
  //res.send("d");
});
app.post('/no',function(req,res){
  console.log("못한 목록");
  console.log(schedulelist);
  var wheredata='none';
  var whatdata = 'none';
  var withdata = 'none';
  var untildata = 'none';
  var finisheddata = 'no';
  var data = [];
  var count = 0;
  var max = 0;
  var pcheck = false;
  var wcheck = false;
  var string = req.body.message;
  var stringArray = string.split(" ");

    var n = -1;
    //장소
    for(var i=0;i<stringArray.length;i++){
      for(var j=0;j<slicewhere.length;j++){
        if(stringArray[i].indexOf(slicewhere[j]) != -1){
          n = stringArray[i].indexOf(slicewhere[j])
          wheredata = stringArray[i].slice(0,n);
        }
      }
    }
  n = -1;
  //until
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<sliceuntil.length;j++){
      if(stringArray[i].indexOf(sliceuntil[j]) != -1){
        n = stringArray[i].indexOf(sliceuntil[j])
        untildata = stringArray[i].slice(0,n);
      }
    }
  }
  n = -1;
  //with
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<slicewith.length;j++){
      if(stringArray[i].indexOf(slicewith[j]) != -1){
        n = stringArray[i].indexOf(slicewith[j])
        withdata = stringArray[i].slice(0,n);

      }
    }
  }
  n = -1;
  //with
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<slicewhat.length;j++){
      if(stringArray[i].indexOf(slicewhat[j]) != -1){
        n = stringArray[i].indexOf(slicewhat[j])
        whatdata = stringArray[i].slice(0,n);
      }
    }
  }
  n = -1;
  //special code
  finisheddata = 'no';

  if(whatdata == 'none'){
    for(var j=0;j<stringArray.length;j++){
      for(var i=0;i< schedulelist.length;i++){
        if(schedulelist[i].WHATDATA == stringArray[j] ){
          whatdata = schedulelist[i].WHATDATA;
        }
      }
    }
  }
  if(wheredata == 'none'){
    for(var j=0;j<stringArray.length;j++){
      for(var i=0;i< schedulelist.length;i++){
        if(schedulelist[i].WHEREDATA == stringArray[j] ){
          wheredata = schedulelist[i].WHEREDATA;
        }
      }
    }
  }

  if(whatdata == "none"){
      whatdata = stringArray[stringArray.length-1];
  }

  console.log('what :', whatdata);
  console.log('where :', wheredata);
  console.log('with :', withdata);
  console.log('until :', untildata);
  //where , and what


  insertDB.run(req.body.date,'withDate',whatdata,wheredata,withdata,untildata,weatherdata,weathersum,finisheddata);
  db.serialize(function () {
    db.each("SELECT COUNT(*) as RESULT FROM WHATTEMP WHERE WHATDATA = ?",whatdata,function(err, row) {
      //  console.log('max:', row.RESULT);
        max = row.RESULT;
        if(max ==0){
          if(weatherdata < 0){
              insertWhatTemp.run(whatdata,1,0,0,0,0);
          }
          else if(weatherdata <5){
              insertWhatTemp.run(whatdata,0,1,0,0,0);
          }
          else if(weatherdata <10){
              insertWhatTemp.run(whatdata,0,0,1,0,0);
          }
          else if(weatherdata < 15){
                insertWhatTemp.run(whatdata,0,0,0,1,0);
          }
          else if(weatherdata <20){
                insertWhatTemp.run(whatdata,0,0,0,0,1);
          }
        }
    });
    db.each("SELECT * FROM WHATTEMP",function(err, row) {
      //console.log('REUSLT:', row);

      if(max!=0){
        if(weatherdata < 0){
            updateWhatTemp.run(row.TEMPMINUS+1,row.TEMP0005,row.TEMP0510,row.TEMP1015,row.TEMP1520,whatdata);
        }
        else if(weatherdata <5){
            updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005+1,row.TEMP0510,row.TEMP1015,row.TEMP1520,whatdata);
        }
        else if(weatherdata <10){
            updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005,row.TEMP0510+1,row.TEMP1015,row.TEMP1520,whatdata);
          }
          else if(weatherdata < 15){
              updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005,row.TEMP0510,row.TEMP1015+1,row.TEMP1520,whatdata);
          }
          else if(weatherdata <20){
              updateWhatTemp.run(row.TEMPMINUS,row.TEMP0005,row.TEMP0510,row.TEMP1015,row.TEMP1520+1,whatdata);
          }
      }
      else{
      }
    });
  });
});
app.post('/new',function(req,res){
  console.log("가능한가요");
  console.log(schedulelist);
  var wheredata='none';
  var whatdata = 'none';
  var withdata = 'none';
  var untildata = 'none';
  var finisheddata = 'no';
  var data = [];
  var count = 0;
  var max = 0;
  var pcheck = false;
  var wcheck = false;
  var string = req.body.message;
  var stringArray = string.split(" ");

    var n = -1;
    //장소
    for(var i=0;i<stringArray.length;i++){
      for(var j=0;j<slicewhere.length;j++){
        if(stringArray[i].indexOf(slicewhere[j]) != -1){
          n = stringArray[i].indexOf(slicewhere[j])
          wheredata = stringArray[i].slice(0,n);
        }
      }
    }
  n = -1;
  //until
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<sliceuntil.length;j++){
      if(stringArray[i].indexOf(sliceuntil[j]) != -1){
        n = stringArray[i].indexOf(sliceuntil[j])
        untildata = stringArray[i].slice(0,n);
      }
    }
  }
  n = -1;
  //with
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<slicewith.length;j++){
      if(stringArray[i].indexOf(slicewith[j]) != -1){
        n = stringArray[i].indexOf(slicewith[j])
        withdata = stringArray[i].slice(0,n);

      }
    }
  }
  n = -1;
  //with
  for(var i=0;i<stringArray.length;i++){
    for(var j=0;j<slicewhat.length;j++){
      if(stringArray[i].indexOf(slicewhat[j]) != -1){
        n = stringArray[i].indexOf(slicewhat[j])
        whatdata = stringArray[i].slice(0,n);
      }
    }
  }
  n = -1;
  //special code
  finisheddata = 'no';

  if(whatdata == 'none'){
    for(var j=0;j<stringArray.length;j++){
      for(var i=0;i< schedulelist.length;i++){
        if(schedulelist[i].WHATDATA == stringArray[j] ){
          whatdata = schedulelist[i].WHATDATA;
        }
      }
    }
  }
  if(wheredata == 'none'){
    for(var j=0;j<stringArray.length;j++){
      for(var i=0;i< schedulelist.length;i++){
        if(schedulelist[i].WHEREDATA == stringArray[j] ){
          wheredata = schedulelist[i].WHEREDATA;
        }
      }
    }
  }

  if(whatdata == "none"){
      whatdata = stringArray[stringArray.length-1];
  }

  console.log('what :', whatdata);
  console.log('where :', wheredata);
  console.log('with :', withdata);
  console.log('until :', untildata);
  var class_name2 = 'WHATDATA';
  var features2 = ["WHEREDATA","WITHDATA","SUMDATA"];
var dt = new DecisionTree(schedulelist, class_name, features);
var dt2 = new DecisionTree(schedulelist,class_name2 ,features2);
var predicted_class_what = dt.predict({
	//WHATDATA: whatdata,
  WHEREDATA: wheredata,
  WITHDATA: withdata,
  SUMDATA: weathersum
});
var predicted_class_where = dt.predict({
WHATDATA: whatdata,
//WHEREDATA: wheredata,
WITHDATA: withdata,
SUMDATA: weathersum
});
var predicted_class_with = dt.predict({
WHATDATA: whatdata,
WHEREDATA: wheredata,
//WITHDATA: withdata,
SUMDATA: weathersum
});
var predicted_class_sum = dt.predict({
WHATDATA: whatdata,
WHEREDATA: wheredata,
WITHDATA: withdata,
//SUMDATA: weathersum
});
var predicted_what = dt2.predict({
  WHEREDATA: wheredata,
  WITHDATA: withdata,
  SUMDATA: weathersum
});
//var accuracy = dt.evaluate(test_data);
//var treeModel = dt.toJSON();
var text;
var count = 0;
var no_count = 0;
console.log('predicted data_what : ',predicted_class_what);
console.log('predicted data_where : ',predicted_class_where);
console.log('predicted data_with : ',predicted_class_with);
console.log('predicted data_sum : ',predicted_class_sum);
console.log('예측값 : ',predicted_what);
if(predicted_class_what == 'no'){
  count++;
}else{
  no_count = 1;
}
if(predicted_class_where == 'no'){
  count++;
}else{
  no_count = 2;
}
if(predicted_class_with == 'no'){
  count++;
}else{
  no_count = 3;
}
if(predicted_class_sum == 'no'){
  count++;
}else{
  no_count = 4;
}

if(count <2){
  text = '가능해보이는 일정입니다.^^';
}else if(count == 2){
  text = '가능해보이는 일정 60%';
}
else if(count ==3){
  if(no_count == 1){
    text = 'Todo 정보가 불가능해보입니다.'
  }else if(no_count ==2){
    text = 'where 정보가 불가능해보입니다.'
  }else if(no_count ==3){
    text = 'with 정보가 불가능해보입니다.'
  }else{
    text = 'weather 정보가 불가능해보입니다.'
  }
}else{
  text = '아...이건..';
}
//var treeModel = dt.toJSON();
//console.dir('tree data : ',treeModel);
//predicted_class



console.log('토큰:',req.body.token);
registrationIds.push(req.body.token);
var message = { //this may vary according to the message type (single recipient, multicast, topic, et cetera)
    to: req.body.token,
    collapse_key: 'your_collapse_key',

    notification: {
        title: '알림',
        body: text
    },

    data: {  //you can send only notification or only data(or include both)
        my_key: 'my value',
        my_another_key: 'my another value'
    }
};
    fcm.send(message, function(err, response){
        if (err) {
            console.log("Something has gone wrong!");
        } else {
            console.log("Successfully sent with response: ", response);
        }
    });
});
   //res.send("Welcome to chat server");
