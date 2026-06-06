import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';

// Create an instance of Notyf
export const notyf = new Notyf({
  duration: 3000,
  position: {
    x: 'center',
    y: 'top',
  },
  types: [
    {
      type: 'error',
      background: '#ef4444', // Tailwind red-500
      dismissible: true,
    },
    {
      type: 'success',
      background: '#22c55e', // Tailwind green-500
      dismissible: true,
    }
  ]
});
