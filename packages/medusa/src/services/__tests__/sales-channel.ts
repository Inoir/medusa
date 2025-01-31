import { IdMap, MockManager, MockRepository } from "medusa-test-utils"
import SalesChannelService from "../sales-channel"
import { EventBusServiceMock } from "../__mocks__/event-bus"
import { EventBusService, StoreService } from "../index"
import { FindConditions, FindOneOptions } from "typeorm"
import { SalesChannel } from "../../models"
import { store, StoreServiceMock } from "../__mocks__/store";

describe("SalesChannelService", () => {
  const salesChannelData = {
    name: "sales channel 1 name",
    description: "sales channel 1 description",
    is_disabled: false,
  }

  const salesChannelRepositoryMock = MockRepository({
    findOne: jest
      .fn()
      .mockImplementation(
        (queryOrId: string | FindOneOptions<SalesChannel>): any => {
          return Promise.resolve({
            id:
              typeof queryOrId === "string"
                ? queryOrId
                : (queryOrId?.where as FindConditions<SalesChannel>)?.id ??
                  IdMap.getId("sc_adjhlukiaeswhfae"),
            ...salesChannelData,
          })
        }
      ),
    create: jest.fn().mockImplementation((data) => data),
    save: (salesChannel) => Promise.resolve({
      id: IdMap.getId("sales_channel_1"),
      ...salesChannel
    }),
    softRemove: jest.fn().mockImplementation((id: string): any => {
      return Promise.resolve()
    }),
  })

  describe("create default", async () => {
    const salesChannelService = new SalesChannelService({
      manager: MockManager,
      eventBusService: EventBusServiceMock as unknown as EventBusService,
      salesChannelRepository: salesChannelRepositoryMock,
      storeService: StoreServiceMock as unknown as StoreService
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("should call the save method if the store does not have a default sales channel", async () => {
      await salesChannelService.createDefault()

      expect(salesChannelRepositoryMock.save).toHaveBeenCalledTimes(1)
      expect(salesChannelRepositoryMock.save).toHaveBeenCalledWith({
        description: "Created by Medusa",
        name: "Default Sales Channel",
        is_disabled: false,
      })
    })

    it("should return the default sales channel if it already exists", async () => {
      const localSalesChannelService = new SalesChannelService({
        manager: MockManager,
        eventBusService: EventBusServiceMock as unknown as EventBusService,
        salesChannelRepository: salesChannelRepositoryMock,
        storeService: {
          ...StoreServiceMock,
          retrieve: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              ...store,
              default_sales_channel_id: IdMap.getId("sales_channel_1"),
              default_sales_channel: {
                id: IdMap.getId("sales_channel_1"),
                ...salesChannelData,
              }
            })
          })
        } as any
      })

      const salesChannel = await localSalesChannelService.createDefault()

      expect(salesChannelRepositoryMock.save).toHaveBeenCalledTimes(0)
      expect(salesChannelRepositoryMock.save).not.toHaveBeenCalledTimes(1)
      expect(salesChannel).toEqual({
        id: IdMap.getId("sales_channel_1"),
        ...salesChannelData,
      })
    })
  })

  describe("retrieve", () => {
    const salesChannelService = new SalesChannelService({
      manager: MockManager,
      eventBusService: EventBusServiceMock as unknown as EventBusService,
      salesChannelRepository: salesChannelRepositoryMock,
      storeService: StoreServiceMock as unknown as StoreService
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it("should retrieve a sales channel", async () => {
      const salesChannel = await salesChannelService.retrieve(
        IdMap.getId("sales_channel_1")
      )

      expect(salesChannel).toBeTruthy()
      expect(salesChannel).toEqual({
        id: IdMap.getId("sales_channel_1"),
        ...salesChannelData,
      })

      expect(salesChannelRepositoryMock.findOne).toHaveBeenCalledTimes(1)
      expect(salesChannelRepositoryMock.findOne).toHaveBeenLastCalledWith({
        where: { id: IdMap.getId("sales_channel_1") },
      })
    })
  })

  describe("update", () => {
    const salesChannelService = new SalesChannelService({
      manager: MockManager,
      eventBusService: EventBusServiceMock as unknown as EventBusService,
      salesChannelRepository: salesChannelRepositoryMock,
      storeService: StoreServiceMock as unknown as StoreService
    })

    const update = {
      name: "updated name",
      description: "updated description",
      is_disabled: true,
    }

    beforeAll(async () => {
      jest.clearAllMocks()
    })

    it("calls save with the updated sales channel", async () => {
      await salesChannelService.update(IdMap.getId("sc"), update)
      expect(salesChannelRepositoryMock.save).toHaveBeenCalledWith({
        id: IdMap.getId("sc"),
        ...update,
      })
    })

    it("returns the saved sales channel", async () => {
      const res = await salesChannelService.update(IdMap.getId("sc"), update)
      expect(res).toEqual({
        id: IdMap.getId("sc"),
        ...update,
      })
    })
  })

  describe("delete", () => {
    const salesChannelService = new SalesChannelService({
      manager: MockManager,
      eventBusService: EventBusServiceMock as unknown as EventBusService,
      salesChannelRepository: salesChannelRepositoryMock,
      storeService: StoreServiceMock as unknown as StoreService
    })

    beforeEach(() => {
      jest.clearAllMocks()
    })

    it('should soft remove a sales channel', async () => {
      const res = await salesChannelService.delete(
        IdMap.getId("sales_channel_1")
      )

      expect(res).toBeUndefined()

      expect(salesChannelRepositoryMock.softRemove)
        .toHaveBeenCalledTimes(1)
      expect(salesChannelRepositoryMock.softRemove)
        .toHaveBeenLastCalledWith({
          id: IdMap.getId("sales_channel_1"),
          ...salesChannelData
        })

      expect(EventBusServiceMock.emit)
        .toHaveBeenCalledTimes(1)
      expect(EventBusServiceMock.emit)
        .toHaveBeenLastCalledWith(
          SalesChannelService.Events.DELETED,
          { "id": IdMap.getId("sales_channel_1") }
        )
    })
  })
})
