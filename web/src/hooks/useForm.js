import { useState } from 'react';

/**
 * Estado mínimo de formulário com erros vindos da API: o back-end responde 422 com
 * `details` por campo (Zod), e cada mensagem aparece embaixo do campo correspondente.
 * @param {Record<string, string>} initialValues
 * @param {(values: Record<string, string>) => Promise<void>} onSubmit
 */
export function useForm(initialValues, onSubmit) {
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const register = (name) => ({
    name,
    value: values[name],
    error: fieldErrors[name],
    onChange: (event) => {
      setValues((current) => ({ ...current, [name]: event.target.value }));
      setFieldErrors((current) => ({ ...current, [name]: undefined }));
    },
  });

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await onSubmit(values);
    } catch (error) {
      const details = error.details ?? {};
      setFieldErrors(
        Object.fromEntries(Object.entries(details).map(([key, messages]) => [key, messages[0]])),
      );
      if (!Object.keys(details).length) setFormError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return { register, handleSubmit, formError, submitting, setFieldErrors };
}
