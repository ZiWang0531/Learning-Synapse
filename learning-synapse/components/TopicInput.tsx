import React, { useState } from 'react';

interface TopicInputProps {
  onSearch: (topic: string) => void;
  isLoading: boolean;
}

const TopicInput: React.FC<TopicInputProps> = ({ onSearch, isLoading }) => {
  const [value, setValue] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) onSearch(value);
  };

  return (
    <div className="w-full max-w-md">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-sky-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative flex items-center">
            <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={isLoading}
            placeholder="What do you want to understand?"
            className="w-full bg-[#0f172a] text-white p-4 pr-12 rounded-lg border border-white/10 focus:outline-none focus:border-sky-500 placeholder-gray-500 font-light tracking-wide shadow-xl"
            />
            <button 
                type="submit"
                disabled={isLoading || !value.trim()}
                className="absolute right-2 p-2 bg-white/5 rounded hover:bg-white/10 transition-colors text-gray-300"
            >
                {isLoading ? (
                     <span className="block w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                )}
            </button>
        </div>
      </form>
    </div>
  );
};

export default TopicInput;