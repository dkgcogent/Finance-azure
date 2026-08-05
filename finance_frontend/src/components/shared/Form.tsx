import React from "react"
import { useForm, FormProvider, useFormContext, UseFormReturn, SubmitHandler, FieldValues, DefaultValues } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { AlertCircle } from "lucide-react"

// Form Wrapper
export interface FormProps<T extends FieldValues> {
  form: UseFormReturn<T>
  onSubmit: SubmitHandler<T>
  children: React.ReactNode
  className?: string
}

export function Form<T extends FieldValues>({ form, onSubmit, children, className = "" }: FormProps<T>) {
  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className={`space-y-6 ${className}`}>
        {children}
      </form>
    </FormProvider>
  )
}

// Form Section Divider
export function FormSection({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-medium">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {children}
      </div>
    </div>
  )
}

// Form Field Wrapper
export interface FormFieldProps {
  name: string
  label: string
  description?: string
  required?: boolean
  className?: string
  children: (field: any) => React.ReactNode
}

export function FormField({ name, label, description, required, className = "", children }: FormFieldProps) {
  const { register, formState: { errors } } = useFormContext()
  
  const error = errors[name]?.message as string | undefined

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-sm font-medium leading-none">
        {label} {required && <span className="text-destructive">*</span>}
      </label>
      
      {/* Expose register to children implicitly or explicitly. Usually we pass register(name) to the child via render props */}
      {children(register(name))}
      
      {description && !error && (
        <p className="text-[0.8rem] text-muted-foreground">{description}</p>
      )}
      
      {error && (
        <div className="flex items-center text-[0.8rem] font-medium text-destructive mt-1">
          <AlertCircle className="h-3 w-3 mr-1" />
          {error}
        </div>
      )}
    </div>
  )
}

// Utility: Create a form hook with Zod schema
export function useZodForm<TFieldValues extends FieldValues>(
  schema: z.ZodType<TFieldValues, any, any>,
  defaultValues?: DefaultValues<TFieldValues>
) {
  return useForm<TFieldValues>({
    resolver: zodResolver(schema),
    defaultValues,
  })
}
