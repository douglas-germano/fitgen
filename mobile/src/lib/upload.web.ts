export async function uploadableFile(uri: string): Promise<File> {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Não foi possível ler a imagem selecionada.');
  const blob = await response.blob();
  const extension = blob.type.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
  return new File([blob], `foto.${extension}`, { type: blob.type });
}
