import React, { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import ContentEditor from './ContentEditor';

describe('<ContentEditor />', () => {
  test('it should mount', () => {
    render(<ContentEditor actionGenerator={(element: React.ReactElement) => element}/>);
    
    const contentEditor = screen.getByTestId('ContentEditor');

    expect(contentEditor).toBeInTheDocument();
  });
});