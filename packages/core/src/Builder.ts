import type { ReportEvent, RecordAny, BuildedData } from './interface'
// 构建数据
// 此时是与平台无关的

// 因为构建的数据基本都和平台向群相同，所以父类约束一下，由子类去实现
export abstract class Builder<T extends RecordAny = RecordAny, R extends RecordAny = RecordAny> {
  build: (reportData: ReportEvent<T>) => BuildedData<T, R>
}
