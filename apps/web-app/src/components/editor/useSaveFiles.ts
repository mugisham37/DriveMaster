import { useEffect } from 'react'
import { useLocalStorage } from '../../utils/use-storage'
import { File } from '../../types'

export const useSaveFiles = ({
  key,
  saveInterval,
  getFiles,
}: {
  key: string
  saveInterval: number
  getFiles: () => File[]
}) => {
  const [files, setFiles] = useLocalStorage<File[]>(
    `solution-files-${key}`,
    getFiles()
  )

  useEffect(() => {
    const interval = setInterval(() => {
      const newFiles = getFiles()
      const filesString = JSON.stringify(files)
      const newFilesString = JSON.stringify(newFiles)

      if (filesString === newFilesString) {
        return
      }

      setFiles(newFiles)
    }, saveInterval)

    return () => clearInterval(interval)
  }, [files, getFiles, saveInterval, setFiles])

  return [files]
}
