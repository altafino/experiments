export function fileAnalysisKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`
}
