export const emptySongForm = {
  title: '',
  artist: '',
  defaultKey: '',
  tempo: '',
  lyrics: '',
  scriptureRef: '',
  isPublic: true,
};

export type SongForm = typeof emptySongForm;
export type SongFormChange = <Field extends keyof SongForm>(field: Field, value: SongForm[Field]) => void;
