import { BuildedData } from './interface'

// 发送器， 因为发送器的逻辑基本时一致的，缓存数据，批量发送，
// 至于具体发送数据的api，有子类重写父类方法
// 1. 控制并发， 发送时机, 最大间隔时长

export interface SendOptions {
  /**
   * 缓存时间间隔
   */
  maxTime: number

  /**
   * 缓存队列的长度
   */
  maxLen: number

  /**
   * 同时只能上报多少个数据，在浏览器端
   */
  concurrentSendCount: number

  /**
   * 发送失败重试次数
   */
  retryCount: number

  /**
   * 发送数据的函数
   */
  // sendDataFn: (d: BuildedData[]) => Promise<any>
}

// 当前收到并发数量限制，暂时没有发送的数据
interface sendQueueData {
  sendData: BuildedData[]
  retryCount: number
}

export class Sender {
  private pool: BuildedData[] = []

  private timer: NodeJS.Timeout | null

  private sendQueue: sendQueueData[] = []

  // 当前发送的数据量
  private currentSendCount: number = 0

  constructor(protected options: SendOptions) {
    // 不同宿主环境的配置默认参数不同，有宿主环境自定义
  }

  send(d: BuildedData) {
    // 将数据放到缓存池中
    this.pool.push(d)

    // 校验并且发送数据
    if (this.pool.length <= this.options.maxLen) {
      this.transSendQueue()
      this.clearSendQueue()
    }
  }

  /**
   * 清空所有数据，会忽略时间的限制，并发数的限制
   */
  clearALl() {
    this.transSendQueue(-1)
    while (this.sendQueue.length) {
      this.clearSendQueue(true)
    }
  }

  /**
   * 从 pool 转到 queue里面
   */
  transSendQueue(len: number = this.options.maxLen) {
    const datas = this.sift(len)
    if (!datas.length) {
      // 没有数据
      return
    }
    this.sendQueue.push({
      sendData: datas,
      retryCount: 0
    })
  }

  sendByTime() {
    if (this.timer !== null) {
      // 清空定时器
      clearTimeout(this.timer)
      this.timer = null
    }
    this.timer = setTimeout(() => {
      // 相当于过期任务，定时清空缓存
      this.transSendQueue()
      this.clearSendQueue()
      this.timer = null
    }, this.options.maxTime)
  }

  clearSendQueue(ignoreLimt = false) {
    const d = this.sendQueue.shift()
    if (d) {
      this.sendData(d, ignoreLimt)
    }
  }

  // 是否超出了最大并发数量
  isOverCur() {
    if (this.options.concurrentSendCount <= 0 || this.options.concurrentSendCount === undefined) {
      return false
    }
    return this.currentSendCount >= this.options.concurrentSendCount
  }

  async sendData(data: { sendData: BuildedData[]; retryCount: number }, ignoreLimit = false) {
    if (ignoreLimit && this.isOverCur()) {
      // 超出了最大限制
      this.sendQueue.push(data)
      return
    }
    try {
      ++this.currentSendCount
      await this.ajax(data.sendData)
      // await this.sendDataToServer sendFn(data.sendData)
      // 发送成功
      --this.currentSendCount
      this.clearSendQueue()
    } catch (error) {
      // 发送失败，重试
      if (data.retryCount >= this.options.retryCount) {
        setTimeout(
          () => {
            --this.currentSendCount
            this.sendData({ ...data, retryCount: data.retryCount + 1 })
          },
          // 简单的重试时间算法
          1000 * (data.retryCount + 1)
        )
      } else {
        --this.currentSendCount
        this.clearSendQueue()
      }
    }
  }

  /**
   * @param count -1 表示清空
   */
  sift(count: number) {
    if (count === -1) {
      const d = this.pool
      this.pool = []
      return d
    }
    // 从缓存池中取数据
    const data: BuildedData[] = []
    while (data.length < count && this.pool.length) {
      data.push(this.pool.shift())
    }
    return data
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async ajax(data: BuildedData[]) {
    throw new Error('sendDataToServer 必须重写')
  }
}
