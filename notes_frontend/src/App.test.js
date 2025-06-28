import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import App from './App';

// Utilities for manipulating global confirm dialog
function mockConfirm(value = true) {
  const original = window.confirm;
  window.confirm = jest.fn(() => value);
  return () => { window.confirm = original; };
}

const MOCK_NOTES = [
  { id: 1, title: "Test Note 1", content: "Alpha" },
  { id: 2, title: "Note 2", content: "Beta content" },
];

// Helper for initial render with mocked fetch
function setupMockFetchForList(notes = MOCK_NOTES) {
  fetch.resetMocks();
  fetch.mockResponseOnce(JSON.stringify(notes));
  return render(<App />);
}

describe('Notes App UI', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  test('renders welcome, fetches and shows note list', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES));
    render(<App />);
    // Wait for initial notes load
    expect(await screen.findByText(/Welcome to Notemaster/i)).toBeInTheDocument();
    expect(await screen.findByText(/Test Note 1/i)).toBeInTheDocument();
    expect(await screen.findByText(/Note 2/i)).toBeInTheDocument();
  });

  test('shows empty state when no notes', async () => {
    fetch.mockResponseOnce(JSON.stringify([]));
    render(<App />);
    expect(await screen.findByText(/Welcome to Notemaster/i)).toBeInTheDocument();
    expect(await screen.findByText(/Click \+/i)).toBeInTheDocument();
    // Sidebar
    expect(await screen.findByText(/No notes yet/i)).toBeInTheDocument();
  });

  test('can create a new note (success path)', async () => {
    // 1. Initial: list is empty
    fetch.mockResponseOnce(JSON.stringify([])); // for fetchNotes

    render(<App />);
    // Sidebar: click "+" (create)
    const createBtn = await screen.findByLabelText(/New note/i);
    fireEvent.click(createBtn);

    // Should see form, fill and submit
    expect(await screen.findByLabelText(/Title/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "My Title" } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: "Note details here" } });

    // Mock create response (POST), then fetchNotes for new list
    fetch
      .mockResponseOnce(JSON.stringify({ id: 3, title: "My Title", content: "Note details here" }), { status: 201 })
      .mockResponseOnce(JSON.stringify([
        { id: 3, title: "My Title", content: "Note details here" }
      ]));

    fireEvent.click(screen.getByText(/^Save$/i));

    // Should navigate to list, show new note
    expect(await screen.findByText(/Welcome to Notemaster/i)).toBeInTheDocument();
    expect(await screen.findByText(/My Title/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/notes'),
      expect.objectContaining({ method: 'POST' })
    );
  });

  test('shows validation errors if form fields are empty', async () => {
    fetch.mockResponseOnce(JSON.stringify([]));
    render(<App />);
    fireEvent.click(await screen.findByLabelText(/New note/i));
    // Leave fields blank and try to save
    fireEvent.click(screen.getByText(/^Save$/i));
    expect(await screen.findByText('Title required')).toBeInTheDocument();
    expect(await screen.findByText('Content required')).toBeInTheDocument();
  });

  test('can view note details', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES));
    render(<App />);
    // Click first note in sidebar
    const viewBtns = await screen.findAllByLabelText(/View note/i);
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES[0])); // fetchNote for details
    fireEvent.click(viewBtns[0]);
    expect(await screen.findByText(/Alpha/i)).toBeInTheDocument();
    expect(await screen.findByText(/Edit/i)).toBeInTheDocument();
    expect(await screen.findByText(/Delete/i)).toBeInTheDocument();
    // Back button
    fireEvent.click(screen.getByText(/Back/i));
    expect(await screen.findByText(/Welcome to Notemaster/i)).toBeInTheDocument();
  });

  test('handles fetch note (view) failure gracefully', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES));
    render(<App />);
    // Simulate backend error for detail view
    const viewBtns = await screen.findAllByLabelText(/View note/i);
    fetch.mockRejectOnce(new Error("Could not fetch note details."));
    fireEvent.click(viewBtns[0]);
    expect(await screen.findByText(/Could not fetch note details/i)).toBeInTheDocument();
  });

  test('can edit a note', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES)); // fetchNotes
    render(<App />);
    // Select note for view
    const viewBtns = await screen.findAllByLabelText(/View note/i);
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES[0])); // fetchNote for details
    fireEvent.click(viewBtns[0]);
    // Edit
    fireEvent.click(await screen.findByText(/^Edit$/i));
    // Change values
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: "Edited Title" } });
    const contentInput = screen.getByLabelText(/Content/i);
    fireEvent.change(contentInput, { target: { value: "Updated Content" } });
    // Mock PUT (update) then updated note list
    fetch
      .mockResponseOnce(JSON.stringify({}), { status: 200 })
      .mockResponseOnce(JSON.stringify([
        { id: 1, title: "Edited Title", content: "Updated Content" },
        // Other notes (simulate unchanged)
        MOCK_NOTES[1]
      ]));
    fireEvent.click(screen.getByText(/^Save$/i));
    // Should see updated content in detail mode
    expect(await screen.findByText(/Edited Title/i)).toBeInTheDocument();
    expect(await screen.findByText(/Updated Content/i)).toBeInTheDocument();
  });

  test('can delete a note (with confirm)', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES)); // fetchNotes
    render(<App />);
    // Select note
    const viewBtns = await screen.findAllByLabelText(/View note/i);
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES[0])); // fetchNote for details
    fireEvent.click(viewBtns[0]);
    // Trap window.confirm to always accept
    const restoreConfirm = mockConfirm(true);
    // Mock DELETE, then refetch list without the deleted note
    fetch
      .mockResponseOnce(JSON.stringify({}), { status: 204 })
      .mockResponseOnce(JSON.stringify([MOCK_NOTES[1]]));
    fireEvent.click(await screen.findByText(/^Delete$/i));
    expect(await screen.findByText(/Welcome to Notemaster/i)).toBeInTheDocument();
    expect(screen.queryByText(/Test Note 1/i)).not.toBeInTheDocument();
    restoreConfirm();
  });

  test('delete cancel: does not call API or remove note', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES)); // fetchNotes
    render(<App />);
    // Select note
    const viewBtns = await screen.findAllByLabelText(/View note/i);
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES[0])); // fetchNote
    fireEvent.click(viewBtns[0]);
    // Trap confirm to always decline
    const restoreConfirm = mockConfirm(false);
    fireEvent.click(await screen.findByText(/^Delete$/i));
    // Should remain on detail, note still present, form not reset
    expect(await screen.findByText(/Test Note 1/i)).toBeInTheDocument();
    expect(fetch).toHaveBeenCalledTimes(2); // Only initial GETs, no DELETE
    restoreConfirm();
  });

  test('shows API error on list fetch fail', async () => {
    fetch.mockRejectOnce(new Error('API error'));
    render(<App />);
    expect(await screen.findByText(/API error/i)).toBeInTheDocument();
  });

  test('shows API error on note creation fail', async () => {
    fetch.mockResponseOnce(JSON.stringify([])); // Fetch notes (empty)
    render(<App />);
    fireEvent.click(await screen.findByLabelText(/New note/i));
    fireEvent.change(screen.getByLabelText(/Title/i), { target: { value: "Bad Note" } });
    fireEvent.change(screen.getByLabelText(/Content/i), { target: { value: "Bad Content" } });
    // Mock POST failure
    fetch.mockRejectOnce(new Error('Failed to create'));
    fireEvent.click(screen.getByText(/^Save$/i));
    expect(await screen.findByText(/Failed to create/i)).toBeInTheDocument();
  });

  test('shows API error on update fail', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES)); // fetchNotes
    render(<App />);
    const viewBtns = await screen.findAllByLabelText(/View note/i);
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES[0]));
    fireEvent.click(viewBtns[0]);
    fireEvent.click(await screen.findByText(/^Edit$/i));
    // Mock PUT failure
    fetch.mockRejectOnce(new Error('Failed to update note.'));
    fireEvent.click(screen.getByText(/^Save$/i));
    expect(await screen.findByText(/Failed to update note/i)).toBeInTheDocument();
  });

  test('shows API error on delete fail', async () => {
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES)); // fetchNotes
    render(<App />);
    const viewBtns = await screen.findAllByLabelText(/View note/i);
    fetch.mockResponseOnce(JSON.stringify(MOCK_NOTES[0]));
    fireEvent.click(viewBtns[0]);
    const restoreConfirm = mockConfirm(true);
    fetch.mockRejectOnce(new Error('Failed to delete note.'));
    fireEvent.click(await screen.findByText(/^Delete$/i));
    expect(await screen.findByText(/Failed to delete note/i)).toBeInTheDocument();
    restoreConfirm();
  });

  test('dismisses error banner', async () => {
    fetch.mockRejectOnce(new Error('Some error'));
    render(<App />);
    const error = await screen.findByText(/Some error/i);
    expect(error).toBeInTheDocument();
    // Dismiss
    fireEvent.click(screen.getByLabelText(/Dismiss error/i));
    await waitFor(() => {
      expect(screen.queryByText(/Some error/i)).not.toBeInTheDocument();
    });
  });
});
