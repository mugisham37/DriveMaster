import { useRef, useEffect } from 'react'
import projectsCache from '../utils/exerciseMap'
import { Exercise } from '../exercises/Exercise'
import type { Config, TaskTest, TestSuiteResult } from '../../types/JikiscriptTypes'

export function useMountViewOrImage({
  config,
  taskTest,
  testSuiteResult,
  inspectedPreviewTaskTest,
}: {
  config: Config
  taskTest: TaskTest | null
  testSuiteResult: TestSuiteResult<unknown> | null
  inspectedPreviewTaskTest: TaskTest | null
}) {
  const viewContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!taskTest) {
      return
    }
    if (!viewContainerRef.current) {
      return
    }
    const Project = projectsCache.get(String(config.projectType))
    let exercise: Exercise | null = null
    if (Project) {
      exercise = new Project()

      const setupFns = taskTest.setupFunctions || []

      setupFns.forEach((functionData) => {
        const [functionName, params = []] = functionData
        if (!exercise) {
          return
        }
        if (typeof exercise[functionName] === 'function') {
          ;(exercise[functionName] as (...args: unknown[]) => unknown)(null, ...params)
        }
      })
    }
    if (exercise && exercise.getView()) {
      const view = exercise.getView()

      if (viewContainerRef.current.children.length > 0) {
        const oldView = viewContainerRef.current.children[0] as HTMLElement
        document.body.appendChild(oldView)
        oldView.style.display = 'none'
      }

      viewContainerRef.current.innerHTML = ''
      viewContainerRef.current.appendChild(view)
      view.style.display = 'block'
    } else {
      let img
      if (viewContainerRef.current.children.length > 0) {
        img = viewContainerRef.current.children[0] as HTMLElement
      } else {
        img = document.createElement('div')
        Object.assign(img.style, {
          width: '100%',
          height: '100%',
          backgroundSize: '90%',
          backgroundRepeat: 'no-repeat',
          backgroundColor: 'white',
          backgroundPosition: 'center',
        })
        viewContainerRef.current.appendChild(img)
      }
      img.style.backgroundImage = `url('https://assets.exercism.org/bootcamp/scenarios/${taskTest.imageSlug}')`

      const viewDisplay = taskTest.imageSlug === undefined ? 'none' : 'block'
      viewContainerRef.current.style.display = viewDisplay
    }
  }, [testSuiteResult, inspectedPreviewTaskTest, config.projectType, taskTest?.imageSlug, taskTest?.setupFunctions, taskTest])

  return viewContainerRef
}
