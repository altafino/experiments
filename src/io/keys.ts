import { inject, type InjectionKey } from 'vue'
import type { CommandBus } from '../commands/CommandBus'

export const commandBusKey: InjectionKey<CommandBus> = Symbol('commandBus')

export function useCommandBus(): CommandBus {
  const commandBus = inject(commandBusKey)
  if (!commandBus) {
    throw new Error('CommandBus is not provided')
  }
  return commandBus
}
