'use client'

import type { CameraMode, SceneRoom } from '@/types/workspace'

import RoomCeiling from '@/components/workspace/three/RoomCeiling'
import RoomFloor from '@/components/workspace/three/RoomFloor'
import RoomFurniture from '@/components/workspace/three/RoomFurniture'
import RoomLabel from '@/components/workspace/three/RoomLabel'

type Props = { room: SceneRoom; mode: CameraMode }

export default function RoomGroup({ room, mode }: Props) {
  return (
    <group>
      <RoomFloor room={room} />
      <RoomCeiling room={room} />
      <RoomFurniture room={room} />
      <RoomLabel room={room} visible={mode === 'orbit' || mode === 'topdown'} />
    </group>
  )
}