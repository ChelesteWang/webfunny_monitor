const { Common, AlarmController, UserController, TimerCalculateController } = require("../controllers/controllers.js")
const log = require("../config/log");
const AccountConfig = require("../config/AccountConfig");
const { accountInfo } = AccountConfig
/**
 * 定时任务
 */
module.exports = (customerWarningCallback) => {
    /**
     * 3秒后开始接收消息队列里的数据
     * */
    setTimeout(() => {
        if (accountInfo.messageQueue === true) {
            // 开始接收消息队列的消息
            Common.startReceiveMsg()
            Common.startReceiveMsgForMog()
        }
        // 将每个项目的配置放入全局变量中
        Common.setProjectConfigList()
        
        // 将项目的webMonitorId列表放入全局变量，并放入bin/webMonitorIdList.js文件中
        // Common.setStopWebMonitorIdList()
    }, 4000)
    /**
     * 2秒后开始进行第一次分析
     * */
    setTimeout(() => {
        // TimerCalculateController.calculateCountByHour(1)
        // Common.calculateCountByDayForTenMinutes(0)
        // TimerCalculateController.calculateCountByDay(0)
        // TimerCalculateController.calculateCountByHour(1)
    }, 2000)
    Common.consoleLogo()
    // 初始化登录验证码
    UserController.setValidateCode()
    global.monitorInfo.loginValidateCodeTimer = setInterval(() => {
        UserController.setValidateCode()
    }, 5 * 60 * 1000)
    /** * 定时任务  开始 */
    setTimeout(() => {
        Common.consoleInfo()
        const startTime = new Date().getTime();
        let count = 0;
        const fixed = async () => {
            count ++;
            const tempDate = new Date()
            const tempTime = new Date().getTime()
            const wrongTime = startTime + count * 1000
            var offset = tempTime - wrongTime;
            var nextTime = 1000 - offset;
            if (nextTime < 0) nextTime = 0;
            const hourTimeStr = tempDate.Format("hh:mm:ss")
            const minuteTimeStr = tempDate.Format("mm:ss")

            // try {
            //     if (hourTimeStr == "00:00:00" || hourTimeStr == "08:00:00") {
            //         // 每天凌晨零点执行重启服务
            //         log.printInfo("当前时间：" + hourTimeStr)
            //         console.log("当前时间：" + hourTimeStr)
            //         log.printInfo("即将重启服务....")
            //         console.log("即将重启服务....")
            //         Common.restartServer()
            //         return
            //     }
            // } catch(e) {
            //     log.printError("重启程序出错：", e)
            // }

            // 每隔1分钟执行
            if (minuteTimeStr.substring(3) == "00") {
                AlarmController.checkAlarm(hourTimeStr, minuteTimeStr)
            }

            try {
                // 如果是凌晨，则计算上一天的分析数据
                if (hourTimeStr > "00:06:00" && hourTimeStr < "00:12:00") {
                    TimerCalculateController.calculateCountByDay(minuteTimeStr, -1)
                } else if (minuteTimeStr > "06:00" && minuteTimeStr < "12:00") {
                    TimerCalculateController.calculateCountByDay(minuteTimeStr, 0)
                }
                // 每小时的前6分钟，会计算小时数据
                if (minuteTimeStr > "00:00" && minuteTimeStr < "06:00") {
                    TimerCalculateController.calculateCountByHour(minuteTimeStr, 1, customerWarningCallback)
                }
                // 每隔1分钟，取出全局变量global.monitorInfo.logCountInMinute的值，并清0
                if (minuteTimeStr.substring(3) == "00") {
                    global.monitorInfo.logCountInMinuteList.push(global.monitorInfo.logCountInMinute)
                    global.monitorInfo.logCountInMinute = 0
                    if (global.monitorInfo.logCountInMinuteList.length > 60) {
                        global.monitorInfo.logCountInMinuteList.shift()
                    }
                }
                // 每小时的51分，开始flush pm2 的日志
                if (minuteTimeStr == "51:00") {
                    Common.pm2Flush()
                }
                // 凌晨0点52分开始创建第二天的数据库表
                if (hourTimeStr == "00:52:00") {
                    Common.createTable()
                } 
                // 凌晨2点开始删除过期的数据库表
                if (hourTimeStr == "02:00:00") {
                    Common.startDelete()
                }
            } catch(e) {
                log.printError("定时器执行报错：", e)
            }
            setTimeout(fixed, nextTime);
        }
        setTimeout(fixed, 1000);
    }, 6000)
}