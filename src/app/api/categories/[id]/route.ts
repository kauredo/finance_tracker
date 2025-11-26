import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { name, color, icon } = await request.json()

    if (!name?.trim()) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      )
    }

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify category is custom and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('is_custom, owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (!existing.is_custom) {
      return NextResponse.json(
        { error: 'Cannot edit default categories' },
        { status: 403 }
      )
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update category
    const { data: category, error } = await supabase
      .from('categories')
      .update({
        name: name.trim(),
        color: color || '#6b7280',
        icon: icon || 'other'
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating category:', error)
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A category with this name already exists' },
          { status: 409 }
        )
      }

      return NextResponse.json(
        { error: 'Failed to update category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ category })
  } catch (error) {
    console.error('Error in update category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify category is custom and belongs to user
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('is_custom, owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    if (!existing.is_custom) {
      return NextResponse.json(
        { error: 'Cannot delete default categories' },
        { status: 403 }
      )
    }

    if (existing.owner_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Check for reassignment
    const { searchParams } = new URL(request.url)
    const reassignTo = searchParams.get('reassign_to')

    // Check if category has transactions
    const { count: transactionCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', id)

    if (transactionCount && transactionCount > 0) {
      if (!reassignTo) {
        return NextResponse.json(
          { 
            error: `Cannot delete category with ${transactionCount} transaction${transactionCount > 1 ? 's' : ''}. Please reassign or delete the transactions first.`,
            transactionCount 
          },
          { status: 400 }
        )
      }

      // Verify target category exists
      const { data: targetCategory, error: targetError } = await supabase
        .from('categories')
        .select('id')
        .eq('id', reassignTo)
        .single()

      if (targetError || !targetCategory) {
        return NextResponse.json(
          { error: 'Target category for reassignment not found' },
          { status: 400 }
        )
      }

      // Reassign transactions
      const { error: reassignError } = await supabase
        .from('transactions')
        .update({ category_id: reassignTo })
        .eq('category_id', id)

      if (reassignError) {
        console.error('Error reassigning transactions:', reassignError)
        return NextResponse.json(
          { error: 'Failed to reassign transactions' },
          { status: 500 }
        )
      }
    }

    // Delete category
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting category:', error)
      return NextResponse.json(
        { error: 'Failed to delete category' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in delete category:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
