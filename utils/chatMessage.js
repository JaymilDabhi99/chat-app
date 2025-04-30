const moment = require("moment");

const formatMessage = (data) => {
  msg = {
    user: data.username,
    message: data.msg,
    date: moment().format("YYYY-MM-DD"),
    time: moment().format("hh:mm a"),
  };

  return msg;
};

module.exports = formatMessage;
